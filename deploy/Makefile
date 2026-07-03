# ponytail: four commands — build, up, logs, clean

build:
	docker compose -f deploy/docker-compose.yml build --pull

up:
	docker compose -f deploy/docker-compose.yml up -d

logs:
	docker compose -f deploy/docker-compose.yml logs -f

clean:
	docker compose -f deploy/docker-compose.yml down -v --rmi all

.PHONY: build up logs clean
