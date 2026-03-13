package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"storage/configuration"
	"storage/internal/models"
	"storage/internal/seed"
	"syscall"
	"time"
)

func main() {
	// Hard security gate: the API will not start without a strong JWT secret.
	// This protects all issued access/refresh tokens.
	if secret := os.Getenv("JWT_SECRET_KEY"); len(secret) < 32 {
		log.Fatal("JWT_SECRET_KEY must be set and at least 32 characters long")
	}

	// Load configuration (port, DB credentials, environment) and open the DB.
	d, err := configuration.Init()
	if err != nil {
		panic(err)
	}

	// Build the Gin router with all middleware and HTTP routes.
	r := Routes(d)

	// Configure the HTTP server with sensible timeouts so slow clients cannot
	// easily exhaust resources.
	srv := &http.Server{
		Addr:         ":" + d.Cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  240 * time.Second,
	}

	// Start the HTTP server in a separate goroutine so we can listen for
	// shutdown signals in main().
	go func() {
		var err error
		err = srv.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Periodically ping the DB connection to keep it healthy.
	go configuration.KeepConnectionsAlive(d.Db, time.Minute*5)

	// In non-production environments, relax FK constraints before AutoMigrate
	// to simplify local schema evolution. In PROD we keep DB constraints intact.
	if d.Cfg.EnvType != "PROD" {
		configuration.DropFKConstraints(d.Db, "public")
	}
	// Auto-migrate all models (create/alter tables) to keep the schema aligned
	// with the Go structs.
	if err := d.Db.AutoMigrate(models.AllModels...); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	// Ensure there is at least one admin user in the system.
	seed.SeedAdmin(d.Db)

	// Background goroutine that periodically normalises reservation statuses
	// based on their dates (active → inProgress → done).
	go configuration.StartStatusUpdater(d.Db, 30*time.Second)

	// Graceful shutdown: wait for SIGINT/SIGTERM and give the server up to
	// 5 seconds to finish in-flight requests.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")

}
