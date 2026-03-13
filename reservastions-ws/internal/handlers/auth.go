package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"storage/configuration"
	. "storage/internal/models"
	"storage/internal/repository"
	. "storage/internal/utils"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	UserRepo         *repository.BaseRepository[User]
	RoleRepo         *repository.BaseRepository[Role]
	RefreshTokenRepo *repository.BaseRepository[RefreshToken]
	Conf             *configuration.Dependencies
	Env              string
}

func NewAuthHandler(conf *configuration.Dependencies) *AuthHandler {
	return &AuthHandler{
		UserRepo:         &repository.BaseRepository[User]{DB: conf.Db},
		RoleRepo:         &repository.BaseRepository[Role]{DB: conf.Db},
		RefreshTokenRepo: &repository.BaseRepository[RefreshToken]{DB: conf.Db},
		Conf:             conf,
		Env:              conf.Cfg.EnvType,
	}
}

// setAuthCookie writes an HttpOnly, SameSite=Lax cookie.
// Secure flag is set only when EnvType is "prod" or "PROD" (case-insensitive).
func (h *AuthHandler) setAuthCookie(c *gin.Context, name, value string, maxAge int) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     name,
		Value:    value,
		MaxAge:   maxAge,
		Path:     "/",
		Secure:   strings.EqualFold(h.Env, "prod"),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// RegisterHandler handles user registration
func (h *AuthHandler) RegisterHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}
		req.Username = strings.TrimSpace(strings.ToLower(req.Username))

		if len(strings.TrimSpace(req.Password)) < 8 {
			SendError(c, INVALID_REQ_PAYLOAD, nil)
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			SendError(c, FAILED_HASH_PASSWORD, err)
			return
		}

		var existingUser User
		if err = h.UserRepo.DB.Where("lower(username) = ?", req.Username).First(&existingUser).Error; err == nil {
			SendError(c, USERNAME_EXISTS, err)
			return
		}

		var userRole Role
		if err = h.RoleRepo.DB.Where("role_name = ?", "USER").First(&userRole).Error; err != nil {
			userRole.RoleName = "USER"
			if err = h.RoleRepo.Create(&userRole); err != nil {
				SendError(c, FAILED_CREATE_ROLE, err)
				return
			}
		}

		u := User{
			Username:  req.Username,
			Password:  string(hashedPassword),
			IsActive:  true,
			LastLogin: time.Now(),
		}

		u.Roles = append(u.Roles, userRole)

		if err := h.UserRepo.Create(&u); err != nil {
			SendError(c, FAILED_CREATE_USER, err)
			return
		}

		SendSuccess(c)
	}
}

// LoginHandler handles the login requests
func (h *AuthHandler) LoginHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		type inUser struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		var inputUser inUser
		jwtKey := os.Getenv("JWT_SECRET_KEY")

		if err := c.ShouldBindJSON(&inputUser); err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}

		inputUser.Username = strings.TrimSpace(strings.ToLower(inputUser.Username))

		var dbUser User
		if err := h.UserRepo.DB.Preload("Roles").Where("lower(username) = ?", inputUser.Username).First(&dbUser).Error; err != nil {
			SendError(c, INVALID_CREDENTIALS, err)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(inputUser.Password)); err != nil {
			SendError(c, INVALID_CREDENTIALS, err)
			return
		}

		accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id":  dbUser.UserID,
			"username": dbUser.Username,
			"roles":    dbUser.GetRoleNames(),
			"exp":      time.Now().Add(time.Hour * 1).Unix(),
		})

		accessTokenString, err := accessToken.SignedString([]byte(jwtKey))
		if err != nil {
			SendError(c, TOKEN_CREATION_FAILED, err)
			return
		}

		refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"username": dbUser.Username,
			"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		})
		refreshTokenString, err := refreshToken.SignedString([]byte(jwtKey))
		if err != nil {
			SendError(c, TOKEN_CREATION_FAILED, err)
			return
		}

		hash := sha256.Sum256([]byte(refreshTokenString))
		rt := RefreshToken{
			TokenHash: hex.EncodeToString(hash[:]),
			UserID:    dbUser.UserID,
			ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		}
		if err := h.RefreshTokenRepo.Create(&rt); err != nil {
			SendError(c, FAILED_CREATE_TOKEN, err)
			return
		}

		h.setAuthCookie(c, "access_token", accessTokenString, 15*60)
		h.setAuthCookie(c, "refresh_token", refreshTokenString, 7*24*60*60)
		h.UserRepo.DB.Model(&dbUser).Update("last_login", time.Now())

		// Return only non-sensitive user info; JWT is stored in HttpOnly cookies.
		SendSuccessBody(c, gin.H{
			"username": dbUser.Username,
			"roles":    dbUser.GetRoleNames(),
		})
	}
}

func (h *AuthHandler) RefreshHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		jwtKey := os.Getenv("JWT_SECRET_KEY")

		refreshToken, err := c.Cookie("refresh_token")
		if err != nil {
			SendError(c, MISSING_TOKEN, err)
			return
		}

		// Validate JWT signature and expiry
		token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtKey), nil
		})
		if err != nil || !token.Valid {
			SendError(c, INVALID_TOKEN, err)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			SendError(c, INVALID_TOKEN_CLAIMS, nil)
			return
		}

		username, ok := claims["username"].(string)
		if !ok || username == "" {
			SendError(c, INVALID_TOKEN_CLAIMS, nil)
			return
		}

		// Atomically delete the token — if two concurrent requests race, only one
		// will find a row to delete (token_hash has a unique index). The loser gets
		// RowsAffected == 0 and is rejected, preventing refresh token reuse.
		hash := sha256.Sum256([]byte(refreshToken))
		tokenHash := hex.EncodeToString(hash[:])
		result := h.RefreshTokenRepo.DB.
			Where("token_hash = ? AND expires_at > ?", tokenHash, time.Now()).
			Delete(&RefreshToken{})
		if result.Error != nil || result.RowsAffected == 0 {
			SendError(c, INVALID_TOKEN, nil)
			return
		}

		var dbUser User
		if err := h.RefreshTokenRepo.DB.Preload("Roles").Where("lower(username) = ?", strings.ToLower(username)).First(&dbUser).Error; err != nil {
			SendError(c, TOKEN_CREATION_FAILED, err)
			return
		}

		// Issue new access token
		newAccess := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id":  dbUser.UserID,
			"username": dbUser.Username,
			"roles":    dbUser.GetRoleNames(),
			"exp":      time.Now().Add(15 * time.Minute).Unix(),
		})
		newAccessStr, err := newAccess.SignedString([]byte(jwtKey))
		if err != nil {
			SendError(c, TOKEN_CREATION_FAILED, err)
			return
		}

		// Issue new refresh token
		newRefresh := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"username": dbUser.Username,
			"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		})
		newRefreshStr, err := newRefresh.SignedString([]byte(jwtKey))
		if err != nil {
			SendError(c, TOKEN_CREATION_FAILED, err)
			return
		}

		newHashArr := sha256.Sum256([]byte(newRefreshStr))
		newRt := RefreshToken{
			TokenHash: hex.EncodeToString(newHashArr[:]),
			UserID:    dbUser.UserID,
			ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		}
		if err := h.RefreshTokenRepo.Create(&newRt); err != nil {
			SendError(c, FAILED_CREATE_TOKEN, err)
			return
		}

		h.setAuthCookie(c, "access_token", newAccessStr, 15*60)
		h.setAuthCookie(c, "refresh_token", newRefreshStr, 7*24*60*60)

		SendSuccessBody(c, gin.H{
			"username": dbUser.Username,
			"roles":    dbUser.GetRoleNames(),
		})
	}
}

func (h *AuthHandler) LogoutHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		refreshToken, err := c.Cookie("refresh_token")
		if err != nil {
			SendError(c, MISSING_TOKEN, err)
			return
		}

		hash := sha256.Sum256([]byte(refreshToken))
		h.RefreshTokenRepo.DB.Where("token_hash = ?", hex.EncodeToString(hash[:])).Delete(&RefreshToken{})

		h.setAuthCookie(c, "refresh_token", "", -1)
		h.setAuthCookie(c, "access_token", "", -1)

		SendSuccess(c)
	}
}
