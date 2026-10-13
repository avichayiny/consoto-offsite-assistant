FROM node:20
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --maxsockets=1 --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "start"]