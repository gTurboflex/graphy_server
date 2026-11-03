FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY graphserver.js UScities.json ./
USER node
EXPOSE 4000
CMD ["node", "graphserver.js"]
