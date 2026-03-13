package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// CORSandCSP configures CORS, basic security headers and a simple Origin-based
// CSRF check for state-changing requests.
func CORSandCSP() gin.HandlerFunc {
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		if os.Getenv("ACTIVE_ENV") == "PROD" {
			panic("ALLOWED_ORIGIN must be set in production")
		}
		allowedOrigin = "http://localhost:8080"
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == allowedOrigin {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Credentials, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		// Basic CSRF mitigation: for state-changing methods, require a trusted Origin
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			// Allow same-origin requests where browsers may omit Origin header
			if origin != "" && origin != allowedOrigin {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
		}

		c.Next()
	}
}
