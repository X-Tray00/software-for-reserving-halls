package middleware

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

func LoggingMiddleware(c *gin.Context) {
	start := time.Now()

	c.Next()

	latency := time.Since(start)

	clientIP := c.ClientIP()
	method := c.Request.Method
	statusCode := c.Writer.Status()
	path := c.Request.URL.Path
	query := c.Request.URL.RawQuery
	if query != "" {
		path = path + "?" + query
	}

	now := time.Now()

	logFileName := now.Format("20060102") + "_log.txt"
	logFilePath := filepath.Join("./logs", logFileName)

	if _, err := os.Stat("./logs"); os.IsNotExist(err) {
		err := os.Mkdir("./logs", 0755)
		if err != nil {
			// Fall back to standard logging without crashing the server
			log.Printf("Error creating logs directory: %v", err)
			return
		}
	}

	logFile, err := os.OpenFile(logFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error opening log file: %v", err)
		return
	}
	defer logFile.Close()

	logEntry := fmt.Sprintf("%s | %3d | %12v | %19s | %-7s %s\n",
		now.Format("2006/01/02 - 15:04:05"),
		statusCode,
		latency,
		clientIP,
		method,
		path,
	)

	if _, err := logFile.WriteString(logEntry); err != nil {
		log.Printf("Error writing to log file: %v", err)
	}
}
