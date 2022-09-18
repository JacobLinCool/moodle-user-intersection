FROM node:alpine as builder

RUN npm i -g pnpm
WORKDIR /app
COPY . .
RUN pnpm i && pnpm rebuild && pnpm build && rm -rf node_modules && pnpm i --prod

FROM jacoblincool/playwright:chromium-light as backend

COPY --from=builder /app /app
WORKDIR /app
ENTRYPOINT [ "npm", "run" ]
CMD [ "backend" ]
