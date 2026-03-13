package seed

import (
	"fmt"
	"io"
	"log"
	"os"
	"storage/internal/models"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedAdmin(db *gorm.DB) {
	for _, roleName := range []string{"USER", "ADMIN"} {
		var role models.Role
		if err := db.Where("role_name = ?", roleName).FirstOrCreate(&role, models.Role{RoleName: roleName}).Error; err != nil {
			log.Printf("seed: failed to create role %s: %v", roleName, err)
			return
		}
	}

	var existing models.User
	if err := db.Where("lower(username) = ?", "admin").First(&existing).Error; err == nil {
		SeedHalls(db)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("seed: failed to hash password: %v", err)
		return
	}

	var adminRole models.Role
	if err := db.Where("role_name = ?", "ADMIN").First(&adminRole).Error; err != nil {
		log.Printf("seed: ADMIN role not found: %v", err)
		return
	}

	admin := models.User{
		Username:  "admin",
		Password:  string(hash),
		IsActive:  true,
		LastLogin: time.Now(),
		Roles:     []models.Role{adminRole},
	}

	if err := db.Create(&admin).Error; err != nil {
		log.Printf("seed: failed to create admin user: %v", err)
		return
	}

	log.Println("seed: admin user created successfully")
	SeedHalls(db)
}

type hallSeed struct {
	models.Hall
	images []string // filenames in seed-images/
}

func SeedHalls(db *gorm.DB) {
	var count int64
	db.Model(&models.Hall{}).Count(&count)
	if count > 0 {
		return
	}

	now := time.Now()
	in := func(d int) time.Time { return now.AddDate(0, 0, d) }

	halls := []hallSeed{
		{
			Hall: models.Hall{
				Name:          "Зала Маринела",
				Capacity:      250,
				Location:      "София, бул. Черни връх 96",
				Available:     true,
				CostPerDay:    680.00,
				Category:      "Тържествена",
				Contact:       "+359 2 962 21 00",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"marinela-hall.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Монтесито",
				Capacity:      400,
				Location:      "София, бул. Александър Малинов 51",
				Available:     true,
				CostPerDay:    950.00,
				Category:      "Луксозна",
				Contact:       "+359 2 489 39 00",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"montecito-hall.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Сердика",
				Capacity:      80,
				Location:      "София, район Сердика, ул. Позитано 21",
				Available:     true,
				CostPerDay:    220.00,
				Category:      "Обредна",
				Contact:       "+359 2 931 30 42",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-serdika.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Средец",
				Capacity:      70,
				Location:      "София, район Средец, ул. Леге 6",
				Available:     true,
				CostPerDay:    200.00,
				Category:      "Обредна",
				Contact:       "+359 2 986 07 04",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-sredec.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Оборище",
				Capacity:      60,
				Location:      "София, район Оборище, ул. Велико Търново 15",
				Available:     true,
				CostPerDay:    190.00,
				Category:      "Обредна",
				Contact:       "+359 2 944 36 10",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-oborishte.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Студентска",
				Capacity:      90,
				Location:      "София, район Студентски, бул. Климент Охридски 4",
				Available:     true,
				CostPerDay:    210.00,
				Category:      "Обредна",
				Contact:       "+359 2 868 01 55",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-studentska.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Красно село",
				Capacity:      75,
				Location:      "София, район Красно село, ул. Хайдушко изворче 2",
				Available:     true,
				CostPerDay:    195.00,
				Category:      "Обредна",
				Contact:       "+359 2 852 14 37",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-krasno-selo.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Обредна зала Триадица",
				Capacity:      65,
				Location:      "София, район Триадица, ул. Алабин 54",
				Available:     true,
				CostPerDay:    185.00,
				Category:      "Обредна",
				Contact:       "+359 2 981 43 65",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"obredna-triadica.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "София Гранд Хол",
				Capacity:      600,
				Location:      "София, пл. Народно събрание 2",
				Available:     true,
				CostPerDay:    1500.00,
				Category:      "Конгресна",
				Contact:       "+359 2 810 00 00",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"sofia-grand-hall.jpg"},
		},
		{
			Hall: models.Hall{
				Name:          "Спортна зала Арена",
				Capacity:      1200,
				Location:      "София, бул. Аспарух 32",
				Available:     true,
				CostPerDay:    2200.00,
				Category:      "Спортна",
				Contact:       "+359 2 777 00 11",
				AvailableFrom: in(1),
				AvailableTo:   in(365),
			},
			images: []string{"sport-hall1.jpg", "sport-hall2.jpg", "sport-hall3.jpg"},
		},
	}

	for i := range halls {
		h := halls[i].Hall
		if err := db.Create(&h).Error; err != nil {
			log.Printf("seed: failed to create hall %q: %v", h.Name, err)
			return
		}

		for _, imgFile := range halls[i].images {
			destName := fmt.Sprintf("%d_%s", h.ID, imgFile)
			if err := copyImage("seed-images/"+imgFile, "uploads/"+destName); err != nil {
				log.Printf("seed: failed to copy image %s: %v", imgFile, err)
				continue
			}
			db.Create(&models.HallImage{HallID: h.ID, ImageName: destName})
		}
	}

	log.Printf("seed: %d halls created successfully", len(halls))
}

func copyImage(src, dst string) error {
	if _, err := os.Stat(dst); err == nil {
		return nil // already exists
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
