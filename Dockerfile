FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY backend ./backend
EXPOSE 8000
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]
