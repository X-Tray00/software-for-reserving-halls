package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"storage/configuration"
	"storage/internal/handlers"
	"storage/internal/services"
	"storage/middleware"
)

// Routes wires all HTTP routes, middleware and groups for the API.
func Routes(d *configuration.Dependencies) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.LoggingMiddleware)
	r.Use(middleware.CORSandCSP())

	r.GET("/version", func(c *gin.Context) {
		c.String(http.StatusOK, "This is version 3.0 - updates: Full code refactoring; Standardize response structure and error handling")
	})

	apiGroup := r.Group("/api")
	{
		// Public routes
		registerAuthRoutes(apiGroup, d)

		apiGroup.GET("/halls/images/:name", handlers.ServeImage()) // Get image by name

		// Authenticated routes
		userGroup := apiGroup.Group("/")
		userGroup.Use(middleware.AuthMiddleware(d))
		userGroup.Use(middleware.AllowedRoles("user"))

		registerHallRoutes(userGroup, d)
		registerReservationRoutes(userGroup, d)

		// Admin-only routes
		adminGroup := userGroup.Group("/admin")
		adminGroup.Use(middleware.AllowedRoles("admin"))

		registerWaitlistRoutes(userGroup, adminGroup, d)
		registerUserRoleRoutes(adminGroup, d)

	}

	return r
}

func registerAuthRoutes(r *gin.RouterGroup, d *configuration.Dependencies) {
	authHandler := handlers.NewAuthHandler(d)
	authGroup := r.Group("/auth")

	authGroup.POST("/login", authHandler.LoginHandler())
	authGroup.POST("/register", authHandler.RegisterHandler())
	authGroup.POST("/refresh", authHandler.RefreshHandler())
	authGroup.POST("/logout", authHandler.LogoutHandler())
}

// --- Reservation Routes ---
func registerReservationRoutes(r *gin.RouterGroup, d *configuration.Dependencies) {
	resHandler := handlers.NewReservationHandler(d)
	resGroup := r.Group("/reservations")

	// Accessible by all authenticated users; handlers themselves enforce whether
	// the caller can modify a given reservation (maker vs admin).
	resGroup.POST("", resHandler.CreateReservation())                     // Create a new reservation
	resGroup.GET("", resHandler.GetReservations())                        // Get reservations (filtered by role inside handler)
	resGroup.DELETE("/:id", resHandler.DeleteReservation())               // Delete own reservation (or admin)
	resGroup.PUT("/:id", resHandler.UpdateReservation())                  // Update own reservation (or admin)
	resGroup.GET("/categorized", resHandler.GetCategorizedReservations()) // Categorized reservations (filtered by role)

	// Admin-only reservation endpoints
	adminRes := resGroup.Group("/")
	adminRes.Use(middleware.AllowedRoles("admin"))
	adminRes.GET("/summary", resHandler.GetReservationSummary())        // Revenue & stats dashboard
	adminRes.PATCH("/:id/status", resHandler.UpdateReservationStatus()) // Manually set status

}

// --- User & Role Routes ---
func registerUserRoleRoutes(r *gin.RouterGroup, d *configuration.Dependencies) {
	userHandler := handlers.NewUserHandler(d)

	// Users
	r.GET("/users", userHandler.GetAllUsers()) // Get all users

	// Roles
	r.GET("/roles", userHandler.GetAllRoles())    // Get all roles
	r.POST("/roles", userHandler.InsertRole())    // Create new role
	r.PUT("/roles/:id", userHandler.UpdateRole()) // Update role

	// Role assignment
	r.POST("/users/:id/roles", userHandler.AssignRole())         // Assign role to a user
	r.DELETE("/users/:id/roles/:role", userHandler.RevokeRole()) // Revoke role from a user
}

// --- Hall Routes ---
func registerHallRoutes(r *gin.RouterGroup, d *configuration.Dependencies) {
	hallHandler := handlers.NewHallHandler(d)
	hallGroup := r.Group("/halls")

	// Read-only: accessible by all authenticated users
	hallGroup.GET("", hallHandler.GetHalls())                              // Get all halls
	hallGroup.GET("/:id", hallHandler.GetHall())                          // Get a hall by ID
	hallGroup.GET("/:id/utilization", services.GetHallUtilizationRate(d)) // Statistics on Hall usage

	// Write operations: admin only
	adminHalls := hallGroup.Group("/")
	adminHalls.Use(middleware.AllowedRoles("admin"))
	adminHalls.POST("", hallHandler.CreateHall())               // Create a new hall
	adminHalls.PUT("/:id", hallHandler.UpdateHall())            // Update a hall by ID
	adminHalls.DELETE("/:id", hallHandler.DeleteHall())         // Delete a hall by ID
	adminHalls.POST("/:id/images", hallHandler.AddHallImages()) // Upload images for a hall
}

// --- Waitlist Routes ---
func registerWaitlistRoutes(userGroup *gin.RouterGroup, adminGroup *gin.RouterGroup, d *configuration.Dependencies) {
	h := handlers.NewWaitlistHandler(d)
	hallGroup := userGroup.Group("/halls")

	// All authenticated users can join / leave the waiting list
	hallGroup.POST("/:id/waitlist", h.Join())
	hallGroup.DELETE("/:id/waitlist", h.Leave())

	// Admin: view all waiting list entries
	adminGroup.GET("/waitlist", h.GetAll())
}
