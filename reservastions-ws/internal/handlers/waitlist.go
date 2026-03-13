package handlers

import (
	"github.com/gin-gonic/gin"
	"storage/configuration"
	. "storage/internal/models"
	"storage/internal/repository"
	. "storage/internal/utils"
	"storage/middleware"
	"strings"
	"time"
)

type WaitlistHandler struct {
	Repo *repository.BaseRepository[WaitingListEntry]
	Conf *configuration.Dependencies
}

func NewWaitlistHandler(conf *configuration.Dependencies) *WaitlistHandler {
	return &WaitlistHandler{
		Repo: &repository.BaseRepository[WaitingListEntry]{DB: conf.Db},
		Conf: conf,
	}
}

// Join adds the authenticated user to the waiting list for a hall.
func (h *WaitlistHandler) Join() gin.HandlerFunc {
	return func(c *gin.Context) {
		hallID := c.Param("id")

		userData, _ := c.Get("user")
		userDetails, _ := userData.(middleware.UserDetails)

		var entry WaitingListEntry
		if err := c.ShouldBindJSON(&entry); err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}

		if entry.StartDate.IsZero() || entry.EndDate.IsZero() {
			SendError(c, INVALID_REQ_PAYLOAD, nil)
			return
		}
		if !entry.StartDate.Before(entry.EndDate) {
			SendError(c, INVALID_REQ_PAYLOAD, nil)
			return
		}
		if entry.StartDate.Before(time.Now().UTC().Truncate(24 * time.Hour)) {
			SendError(c, INVALID_REQ_PAYLOAD, nil)
			return
		}

		// Check if user is already on the waiting list for this hall
		var count int64
		h.Conf.Db.Model(&WaitingListEntry{}).
			Where("hall_id = ? AND LOWER(username) = ?", hallID, strings.ToLower(userDetails.Username)).
			Count(&count)
		if count > 0 {
			SendError(c, ALREADY_ON_WAITLIST, nil)
			return
		}

		var hall Hall
		if err := h.Conf.Db.First(&hall, hallID).Error; err != nil {
			SendError(c, HALL_NOT_FOUND, err)
			return
		}

		entry.HallID = hall.ID
		entry.Username = strings.ToLower(userDetails.Username)

		if err := h.Repo.Create(&entry); err != nil {
			SendError(c, FAILED_WAITLIST_OP, err)
			return
		}

		SendSuccessBody(c, entry)
	}
}

// Leave removes the authenticated user from the waiting list for a hall.
func (h *WaitlistHandler) Leave() gin.HandlerFunc {
	return func(c *gin.Context) {
		hallID := c.Param("id")

		userData, _ := c.Get("user")
		userDetails, _ := userData.(middleware.UserDetails)

		result := h.Conf.Db.
			Where("hall_id = ? AND LOWER(username) = ?", hallID, strings.ToLower(userDetails.Username)).
			Delete(&WaitingListEntry{})

		if result.RowsAffected == 0 {
			SendError(c, WAITLIST_ENTRY_NOT_FOUND, nil)
			return
		}

		SendSuccess(c)
	}
}

// GetAll returns all waiting list entries (admin only).
func (h *WaitlistHandler) GetAll() gin.HandlerFunc {
	return func(c *gin.Context) {
		var entries []WaitingListEntry
		if err := h.Conf.Db.Preload("Hall").Order("created_at desc").Find(&entries).Error; err != nil {
			SendError(c, FAILED_WAITLIST_OP, err)
			return
		}
		SendSuccessBody(c, entries)
	}
}
