# Étape 1 : Build de l'application React
FROM node:20-alpine AS build

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json package-lock.json ./

# Installation des dépendances
RUN npm ci

# Copie du code source
COPY . .

# Build pour la production
RUN npm run build

# Étape 2 : Serveur Web Nginx pour servir les fichiers statiques
FROM nginx:alpine

# Copie des fichiers buildés depuis l'étape 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copie de la configuration Nginx personnalisée (optionnel mais recommandé pour React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
