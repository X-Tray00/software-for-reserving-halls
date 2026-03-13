package models

import (
	"time"
)

type User struct {
	UserID    int64     `gorm:"column:id;primaryKey" json:"id"`
	Username  string    `gorm:"column:username;size:50;unique;not null" json:"username"`
	Password  string    `gorm:"column:password;size:255;not null" json:"-"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
	LastLogin time.Time `gorm:"column:last_login" json:"last_login"`
	IsActive  bool      `gorm:"column:is_active" json:"is_active"`
	Roles     []Role    `gorm:"many2many:users_roles;joinForeignKey:UserID;joinReferences:RoleID" json:"roles,omitempty"`
}

type RefreshToken struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	TokenHash string    `gorm:"column:token_hash;size:500;uniqueIndex;not null"`
	UserID    int64     `gorm:"column:user_id;not null;index"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
	CreatedAt time.Time
}

type UserRoles struct {
	RoleID int64 `gorm:"column:role_id;primaryKey"`
	UserID int64 `gorm:"column:user_id;primaryKey"`
}

type Role struct {
	RoleID    int64     `gorm:"column:id;primaryKey" json:"role_id"`
	RoleName  string    `gorm:"column:role_name;unique;size:255;not null" json:"role_name"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	Users     []User    `gorm:"many2many:users_roles;joinForeignKey:RoleID;joinReferences:UserID" json:"users,omitempty"`
}

type ChangePassword struct {
	Username       string `json:"username"`
	CurrPassword   string `json:"curr_password"`
	NewPassword    string `json:"new_password"`
	RepeatPassword string `json:"repeat_password"`
}

func (u User) GetRoleNames() []string {
	var roleNames = make([]string, 0)
	for _, role := range u.Roles {
		roleNames = append(roleNames, role.RoleName)
	}
	return roleNames
}

func (Role) TableName() string {
	return "roles"
}

func (UserRoles) TableName() string {
	return "users_roles"
}

func (User) TableName() string {
	return "users"
}

func (RefreshToken) TableName() string {
	return "refresh_tokens"
}
