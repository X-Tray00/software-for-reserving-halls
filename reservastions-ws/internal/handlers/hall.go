package handlers

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"mime/multipart"
	"os"
	"path/filepath"
	"storage/configuration"
	. "storage/internal/models"
	"storage/internal/repository"
	. "storage/internal/utils"
	"strings"
	"time"
)

type HallHandler struct {
	Repo *repository.BaseRepository[Hall]
	Conf *configuration.Dependencies
}

func NewHallHandler(conf *configuration.Dependencies) *HallHandler {
	return &HallHandler{
		Repo: &repository.BaseRepository[Hall]{DB: conf.Db},
		Conf: conf,
	}
}

// validateImageFiles performs basic sanity checks on uploaded image files to
// prevent abuse (very large files or unexpected types).
func validateImageFiles(files []*multipart.FileHeader) error {
	if len(files) == 0 {
		return nil
	}

	const maxFiles = 10
	const maxSize = 5 * 1024 * 1024 // 5MB per file

	if len(files) > maxFiles {
		return fmt.Errorf("too many files: maximum %d images allowed", maxFiles)
	}

	allowedExt := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}

	for _, f := range files {
		if f.Size > maxSize {
			return fmt.Errorf("file %q is too large", f.Filename)
		}
		ext := strings.ToLower(filepath.Ext(f.Filename))
		if !allowedExt[ext] {
			return fmt.Errorf("file %q has unsupported extension %q", f.Filename, ext)
		}
	}

	return nil
}


// CreateHall handles the creation of a new hall with optional image upload.
func (h *HallHandler) CreateHall() gin.HandlerFunc {
	return func(c *gin.Context) {
		form, err := c.MultipartForm()
		if err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}

		hallData := form.Value["hall"]
		if len(hallData) == 0 {
			SendError(c, MISSING_HALL_DATA, nil)
			return
		}

		var hall Hall
		if err := json.Unmarshal([]byte(hallData[0]), &hall); err != nil {
			SendError(c, INVALID_HALL_DATA, err)
			return
		}

		if hall.Capacity <= 0 || hall.CostPerDay <= 0 {
			SendError(c, CAPACITY_AND_COST_ERROR, nil)
			return
		}

		if len(hall.Name) == 0 || len(hall.Name) > 255 ||
			len(hall.Location) > 255 || len(hall.Category) > 100 || len(hall.Contact) > 255 {
			SendError(c, INVALID_HALL_DATA, nil)
			return
		}

		if !hall.AvailableFrom.IsZero() && !hall.AvailableTo.IsZero() {
			if !hall.AvailableFrom.Before(hall.AvailableTo) {
				SendError(c, INVALID_DATE_RANGE, nil)
				return
			}
			if hall.AvailableFrom.Before(time.Now()) {
				SendError(c, AVAILABLE_FROM_IN_PAST, nil)
				return
			}
		}

		if err := h.Repo.Create(&hall); err != nil {
			SendError(c, FAILED_CREATE_HALL, err)
			return
		}

		files := form.File["images"]
		if err := validateImageFiles(files); err != nil {
			SendError(c, FAILED_SAVE_IMAGE, err)
			return
		}
		for _, file := range files {
			filename := fmt.Sprintf("%d_%s", hall.ID, filepath.Base(file.Filename))
			if err := c.SaveUploadedFile(file, "uploads/"+filename); err != nil {
				SendError(c, FAILED_SAVE_IMAGE, err)
				return
			}

			image := HallImage{
				HallID:    hall.ID,
				ImageName: filename,
			}
			if err := h.Conf.Db.Create(&image).Error; err != nil {
				SendError(c, FAILED_SAVE_IMAGE_DATA, err)
				return
			}
		}

		SendSuccessBody(c, hall)
	}
}

// AddHallImages handles the uploading new images for a hall
func (h *HallHandler) AddHallImages() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var hall Hall
		if err := h.Repo.GetByID(id, &hall); err != nil {
			SendError(c, HALL_NOT_FOUND, err)
			return
		}

		form, err := c.MultipartForm()
		if err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}

		files := form.File["images"]
		if len(files) == 0 {
			SendError(c, MISSING_IMAGES, nil)
			return
		}

		if err := validateImageFiles(files); err != nil {
			SendError(c, FAILED_SAVE_IMAGE, err)
			return
		}

		var savedImages []HallImage
		for _, file := range files {
			filename := fmt.Sprintf("%d_%s", hall.ID, filepath.Base(file.Filename))

			savePath := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(file, savePath); err != nil {
				SendError(c, FAILED_SAVE_IMAGE, err)
				return
			}

			image := HallImage{
				HallID:    hall.ID,
				ImageName: filename,
			}

			if err := h.Conf.Db.Create(&image).Error; err != nil {
				SendError(c, FAILED_SAVE_IMAGE_DATA, err)
				return
			}

			savedImages = append(savedImages, image)
		}

		SendSuccessBody(c, gin.H{
			"message": "Images uploaded successfully",
			"count":   len(savedImages),
			"images":  savedImages,
		})
	}
}


// GetHall retrieves hall with reservations and images.
func (h *HallHandler) GetHall() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var hall Hall
		if err := h.Repo.GetByID(id, &hall, "Reservations", "HallImages"); err != nil {
			SendError(c, HALL_NOT_FOUND, err)
			return
		}

		// Populate image URLs (initialise to empty slice so JSON serialises as [] not null)
		hall.ImageURLs = []string{}
		for _, image := range hall.HallImages {
			hall.ImageURLs = append(hall.ImageURLs, image.ImageName)
		}

		SendSuccessBody(c, hall)
	}
}

// GetHalls retrieves all halls with reservations and images.
func (h *HallHandler) GetHalls() gin.HandlerFunc {
	return func(c *gin.Context) {
		var halls []Hall
		err := h.Repo.GetAll(&halls, "Reservations", "HallImages")
		if err != nil {
			SendError(c, FAILED_GET_HALLS, err)
			return
		}

		for i := range halls {
			halls[i].ImageURLs = []string{}
			for _, image := range halls[i].HallImages {
				halls[i].ImageURLs = append(halls[i].ImageURLs, image.ImageName)
			}
		}

		SendSuccessBody(c, halls)
	}
}


// UpdateHall updates a hall by ID. Accepts multipart/form-data with a JSON "hall" field and optional "images" files.
func (h *HallHandler) UpdateHall() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var existing Hall
		if err := h.Repo.GetByID(id, &existing); err != nil {
			SendError(c, HALL_NOT_FOUND, err)
			return
		}

		form, err := c.MultipartForm()
		if err != nil {
			SendError(c, INVALID_REQ_PAYLOAD, err)
			return
		}

		hallData := form.Value["hall"]
		if len(hallData) == 0 {
			SendError(c, MISSING_HALL_DATA, nil)
			return
		}

		var updated Hall
		if err := json.Unmarshal([]byte(hallData[0]), &updated); err != nil {
			SendError(c, INVALID_HALL_DATA, err)
			return
		}

		existing.Name = updated.Name
		existing.Category = updated.Category
		existing.Location = updated.Location
		existing.Capacity = updated.Capacity
		existing.CostPerDay = updated.CostPerDay
		existing.Contact = updated.Contact
		existing.Available = updated.Available

		if err := h.Repo.Update(id, &existing); err != nil {
			SendError(c, FAILED_UPDATE_HALL, err)
			return
		}

		// If new images are provided, validate and replace existing ones
		files := form.File["images"]
		if len(files) > 0 {
			if err := validateImageFiles(files); err != nil {
				SendError(c, FAILED_SAVE_IMAGE, err)
				return
			}
			var oldImages []HallImage
			h.Conf.Db.Where("hall_id = ?", existing.ID).Find(&oldImages)
			for _, img := range oldImages {
				os.Remove(filepath.Join("uploads", img.ImageName))
			}
			h.Conf.Db.Where("hall_id = ?", existing.ID).Delete(&HallImage{})

			for _, file := range files {
				filename := fmt.Sprintf("%d_%s", existing.ID, filepath.Base(file.Filename))
				if err := c.SaveUploadedFile(file, filepath.Join("uploads", filename)); err != nil {
					SendError(c, FAILED_SAVE_IMAGE, err)
					return
				}
				image := HallImage{HallID: existing.ID, ImageName: filename}
				if err := h.Conf.Db.Create(&image).Error; err != nil {
					SendError(c, FAILED_SAVE_IMAGE_DATA, err)
					return
				}
			}
		}

		SendSuccessBody(c, existing)
	}
}

// DeleteHall deletes a hall by ID. It first removes related hall_images and
// reservations (and their receipt files) to satisfy foreign key constraints.
func (h *HallHandler) DeleteHall() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var hall Hall
		if err := h.Repo.GetByID(id, &hall, "HallImages"); err != nil {
			SendError(c, HALL_NOT_FOUND, err)
			return
		}

		// Delete reservations for this hall (and their receipt files)
		var reservations []Reservation
		h.Conf.Db.Where("hall_id = ?", id).Find(&reservations)
		for _, r := range reservations {
			_ = deleteReceiptFile(r.ID)
		}
		if err := h.Conf.Db.Where("hall_id = ?", id).Delete(&Reservation{}).Error; err != nil {
			SendError(c, FAILED_DELETE_HALL, err)
			return
		}

		// Delete hall images and their files from uploads/
		for _, img := range hall.HallImages {
			_ = os.Remove(filepath.Join("uploads", img.ImageName))
		}
		if err := h.Conf.Db.Where("hall_id = ?", id).Delete(&HallImage{}).Error; err != nil {
			SendError(c, FAILED_DELETE_HALL, err)
			return
		}

		if err := h.Repo.Delete(id); err != nil {
			SendError(c, FAILED_DELETE_HALL, err)
			return
		}

		SendSuccess(c)
	}
}

// ServeImage retrieves an image
func ServeImage() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use filepath.Base to strip any directory components, preventing path traversal
		name := filepath.Base(c.Param("name"))

		if name == "default.jpg" || name == "." || name == "/" {
			SendSuccess(c)
			return
		}

		imagePath := filepath.Join("uploads", name)

		if _, err := os.Stat(imagePath); os.IsNotExist(err) {
			SendError(c, IMAGE_NOT_FOUND, err)
			return
		}

		// Whitelist-only: reject any file that isn't a known image type
		allowedExts := map[string]string{
			".jpg":  "image/jpeg",
			".jpeg": "image/jpeg",
			".png":  "image/png",
			".webp": "image/webp",
		}
		ext := filepath.Ext(name)
		contentType, ok := allowedExts[ext]
		if !ok {
			SendError(c, IMAGE_NOT_FOUND, nil)
			return
		}

		c.Header("Content-Type", contentType)
		c.File(imagePath)
	}
}
