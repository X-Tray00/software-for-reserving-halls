package configuration

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"time"
)

func Init() (*Dependencies, error) {
	cfg, err := loadCfg()
	if err != nil {
		return nil, err
	}

	var usedConfig EnvironmentConfig

	for _, env := range cfg.EnvironmentConfig {
		if env.EnvType == cfg.ActiveEnvironment {
			usedConfig = env
			break
		}
	}

	if cfg.ActiveEnvironment == "PROD" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	db, err := connectDb(&usedConfig.Database)
	if err != nil {
		return nil, err
	}

	return &Dependencies{
		Cfg: &usedConfig,
		Db:  db,
	}, nil
}

func KeepConnectionsAlive(db *gorm.DB, interval time.Duration) {
	for {
		db.Exec("SELECT 1")
		time.Sleep(interval)
	}
}

// StartStatusUpdater runs a background goroutine that periodically updates
// reservation statuses (active → inProgress → done) based on current date.
func StartStatusUpdater(db *gorm.DB, interval time.Duration) {
	for {
		now := time.Now().UTC().Truncate(24 * time.Hour)

		db.Exec(`UPDATE reservations
			SET status = 'inProgress'
			WHERE CURRENT_DATE BETWEEN DATE(start_date) AND DATE(end_date)
			  AND status != 'inProgress'`)

		db.Exec(`UPDATE reservations
			SET status = 'done'
			WHERE CURRENT_DATE > DATE(end_date)
			  AND status != 'done'`)

		_ = now
		time.Sleep(interval)
	}
}

func loadCfg() (*MainConfig, error) {
	file, err := os.Open("./configuration/config.json")
	if err != nil {
		return nil, err
	}

	defer file.Close()

	var cfg MainConfig

	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&cfg); err != nil {
		return nil, err
	}

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	// Allow overriding the active environment via env var (useful for Docker/CI).
	if override := os.Getenv("ACTIVE_ENV"); override != "" {
		cfg.ActiveEnvironment = override
	}

	return &cfg, nil
}

func connectDb(cfg *Database) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		cfg.Host, cfg.User, cfg.Password, cfg.DatabaseName, cfg.Port,
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	if err = sqlDB.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func validateConfig(cfg *MainConfig) error {
	validate := validator.New()
	if err := validate.Struct(cfg); err != nil {
		return err
	}
	return nil
}

// DropFKConstraints drops all foreign key constraints in the given schema so
// that AutoMigrate can recreate them without hitting duplicate-name errors.
func DropFKConstraints(db *gorm.DB, schema string) error {
	var rows []struct {
		TableName      string `gorm:"column:table_name"`
		ConstraintName string `gorm:"column:constraint_name"`
	}
	db.Raw(`SELECT tc.table_name, tc.constraint_name
		FROM information_schema.table_constraints tc
		WHERE tc.constraint_type = 'FOREIGN KEY'
		  AND tc.table_schema = ?`, schema).Scan(&rows)

	for _, r := range rows {
		db.Exec(fmt.Sprintf(`ALTER TABLE "%s"."%s" DROP CONSTRAINT "%s"`, schema, r.TableName, r.ConstraintName))
	}
	return nil
}
