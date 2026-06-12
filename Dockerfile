FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV DB_PATH=/data/leaderboard.db
ENV SETTINGS_PATH=/data/settings.json
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

VOLUME ["/data"]

CMD ["npm", "start"]
