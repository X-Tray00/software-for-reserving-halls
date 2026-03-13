# ── Stage 1: Build ────────────────────────────────────────────
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o reservations-ws .

# ── Stage 2: Run ──────────────────────────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/reservations-ws .
COPY configuration/config.json ./configuration/config.json
COPY seed-images/ ./seed-images/

RUN mkdir -p uploads receipt logs

EXPOSE 8000
CMD ["./reservations-ws"]
