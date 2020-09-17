FROM node:lts-alpine

COPY . .

RUN npm i

EXPOSE 3000

CMD ["npm", "run", "dev"]