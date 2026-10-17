FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.mjs ./
COPY src ./src
COPY docs ./docs
COPY index.html 3d.html neocity.html favicon.svg ./
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
