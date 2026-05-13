# ============================================================
# Makefile untuk NestJS Consensus App
# APP_MODE: raft | paxos | lib | all
#
# PORT:
#   raft-1/2/3  → 3001/3002/3003
#   paxos-1/2/3 → 4001/4002/4003
#   lib-app      → 5000
# ============================================================


note:
	# 1. Setup awal
	make install
	make build
	make db-setup     # buat DB + migrasi
	make db-seed      # isi role admin/member + permission

	# 2. Pilih mode yang mau dijalankan
	make pm2-start-raft     # hanya Raft cluster
	make pm2-start-paxos    # hanya Paxos cluster
	make pm2-start-lib      # hanya Library app

	# 3. Kubernetes (k3s)
	make k8s-deploy-raft

	# 4. Helm "cabut colok"
	make helm-install-paxos   # install hanya Paxos
	make helm-upgrade         # setelah edit values.yaml
	make helm-uninstall       # cabut semua


.PHONY: install build dev start \
        db-setup db-seed db-migrate-generate \
        pm2-start-raft pm2-start-paxos pm2-start-lib pm2-start-all pm2-stop pm2-logs \
        docker-build docker-run-raft docker-run-paxos docker-run-lib \
        k8s-deploy-raft k8s-deploy-paxos k8s-deploy-lib k8s-deploy-all k8s-delete-all k8s-hpa-status \
        systemd-install \
        systemd-start-raft systemd-start-paxos systemd-start-lib \
        systemd-stop-raft systemd-stop-paxos systemd-stop-lib systemd-stop-all \
        systemd-logs-raft systemd-logs-paxos systemd-logs-lib \
        helm-install helm-install-raft helm-install-paxos helm-install-lib \
        helm-upgrade helm-uninstall

# ==========================================
# SETUP & BUILD
# ==========================================

# Menginstal semua dependensi Node.js
install:
	npm install

# Build dist/ (wajib sebelum PM2, Docker, atau systemd)
build:
	npm run build

# Mode development dengan hot-reload
dev:
	npm run start:dev

# Jalankan 1 node manual (default port 3000, APP_MODE=all)
start:
	npm run start

# ==========================================
# DATABASE COMMANDS
# ==========================================

# Buat database "libraries" + jalankan migrasi
db-setup:
	npx ts-node scripts/create-db.ts
	npm run migration:run

# Masukkan data awal: Role admin/member + Permission
db-seed:
	npx ts-node scripts/seed.ts

# Generate file migrasi baru setelah ada perubahan entity
db-migrate-generate:
	npm run migration:generate

# ==========================================
# PM2 COMMANDS
# ==========================================

# Menjalankan Raft Cluster (3 node, port 3001-3003)
pm2-start-raft:
	npx pm2 start ecosystem.config.js --only "raft-1,raft-2,raft-3"

# Menjalankan Paxos Cluster (3 node, port 4001-4003)
pm2-start-paxos:
	npx pm2 start ecosystem.config.js --only "paxos-1,paxos-2,paxos-3"

# Menjalankan Library App (1 node, port 5000)
pm2-start-lib:
	npx pm2 start ecosystem.config.js --only "lib-app"

# Menjalankan Cluster Dashboard (1 node, port 3004)
pm2-start-dash:
	npx pm2 start ecosystem.config.js --only "cluster-dash"

# Menjalankan semua modul sekaligus
pm2-start-all:
	npx pm2 start ecosystem.config.js

# Hentikan semua proses PM2
pm2-stop:
	npx pm2 stop all

# Lihat log semua proses PM2
pm2-logs:
	npx pm2 logs

# ==========================================
# DOCKER COMMANDS
# ==========================================

# Build Docker image
docker-build:
	docker build -t paxos-raft-node .

# Jalankan Raft node 1 (contoh, pastikan raft-2/3 sudah jalan)
docker-run-raft:
	docker run --rm -p 3001:3001 \
	  -e APP_MODE=raft -e PORT=3001 \
	  -e PEERS="http://host.docker.internal:3002,http://host.docker.internal:3003" \
	  paxos-raft-node

# Jalankan Paxos node 1 (contoh)
docker-run-paxos:
	docker run --rm -p 4001:4001 \
	  -e APP_MODE=paxos -e PORT=4001 \
	  -e PEERS="http://host.docker.internal:4002,http://host.docker.internal:4003" \
	  paxos-raft-node

# Jalankan Library App
docker-run-lib:
	docker run --rm -p 5000:5000 \
	  -e APP_MODE=lib -e PORT=5000 \
	  paxos-raft-node

# ==========================================
# KUBERNETES COMMANDS (kubectl)
# ==========================================

# Deploy masing-masing mode ke Kubernetes/k3s
k8s-deploy-raft:
	kubectl apply -f deploy/k8s/raft.yaml

k8s-deploy-paxos:
	kubectl apply -f deploy/k8s/paxos.yaml

k8s-deploy-lib:
	kubectl apply -f deploy/k8s/lib.yaml

# Deploy semua sekaligus
k8s-deploy-all:
	kubectl apply -f deploy/k8s/raft.yaml
	kubectl apply -f deploy/k8s/paxos.yaml
	kubectl apply -f deploy/k8s/lib.yaml

# Hapus semua deployment dari Kubernetes
k8s-delete-all:
	kubectl delete -f deploy/k8s/raft.yaml
	kubectl delete -f deploy/k8s/paxos.yaml
	kubectl delete -f deploy/k8s/lib.yaml

# Cek status HPA semua pod
k8s-hpa-status:
	kubectl get hpa

# ==========================================
# SYSTEMD COMMANDS (Linux VM)
# ==========================================

# Salin semua .service ke /etc/systemd/system/ dan reload daemon
# Jalankan ini 1x setelah copy binary ke server
systemd-install:
	sudo cp deploy/systemd/*.service /etc/systemd/system/
	sudo systemctl daemon-reload

# --- RAFT ---
systemd-start-raft:
	sudo systemctl start raft-1 raft-2 raft-3
	sudo systemctl enable raft-1 raft-2 raft-3

systemd-stop-raft:
	sudo systemctl stop raft-1 raft-2 raft-3
	sudo systemctl disable raft-1 raft-2 raft-3

systemd-logs-raft:
	sudo journalctl -u raft-1 -f

# --- PAXOS ---
systemd-start-paxos:
	sudo systemctl start paxos-1 paxos-2 paxos-3
	sudo systemctl enable paxos-1 paxos-2 paxos-3

systemd-stop-paxos:
	sudo systemctl stop paxos-1 paxos-2 paxos-3
	sudo systemctl disable paxos-1 paxos-2 paxos-3

systemd-logs-paxos:
	sudo journalctl -u paxos-1 -f

# --- LIB ---
systemd-start-lib:
	sudo systemctl start lib-app
	sudo systemctl enable lib-app

systemd-stop-lib:
	sudo systemctl stop lib-app
	sudo systemctl disable lib-app

systemd-logs-lib:
	sudo journalctl -u lib-app -f

# Hentikan semua sekaligus
systemd-stop-all:
	sudo systemctl stop raft-1 raft-2 raft-3 paxos-1 paxos-2 paxos-3 lib-app
	sudo systemctl disable raft-1 raft-2 raft-3 paxos-1 paxos-2 paxos-3 lib-app

# ==========================================
# HELM COMMANDS (k3s / Kubernetes via Helm)
# Konsep "cabut colok" → atur enabled di values.yaml
# atau override langsung pakai --set saat install
# ==========================================

# Install dengan semua mode aktif (default values.yaml)
helm-install:
	helm install consensus-app deploy/helm

# Install HANYA Raft (paxos & lib disabled)
helm-install-raft:
	helm install consensus-app deploy/helm \
	  --set raft.enabled=true \
	  --set paxos.enabled=false \
	  --set lib.enabled=false

# Install HANYA Paxos
helm-install-paxos:
	helm install consensus-app deploy/helm \
	  --set raft.enabled=false \
	  --set paxos.enabled=true \
	  --set lib.enabled=false

# Install HANYA Library App
helm-install-lib:
	helm install consensus-app deploy/helm \
	  --set raft.enabled=false \
	  --set paxos.enabled=false \
	  --set lib.enabled=true

# Upgrade rilis (misal setelah ubah values.yaml)
helm-upgrade:
	helm upgrade consensus-app deploy/helm

# Uninstall (cabut semua)
helm-uninstall:
	helm uninstall consensus-app
