package models

import "time"

// WaitingListEntry represents a user who wants to be notified when a hall becomes available.
type WaitingListEntry struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	HallID    uint      `gorm:"not null;index" json:"hall_id"`
	Hall      Hall      `gorm:"foreignKey:HallID" json:"hall,omitempty"`
	Username  string    `gorm:"not null;size:255;index" json:"username"`
	StartDate time.Time `gorm:"not null" json:"start_date"`
	EndDate   time.Time `gorm:"not null" json:"end_date"`
	CreatedAt time.Time `json:"created_at"`
}

func (WaitingListEntry) TableName() string {
	return "waiting_list"
}
