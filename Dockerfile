FROM node:10.17.0-alpine as BASE
ENV pwsModule="ias-gestion-api"
WORKDIR /$pwsModule
COPY index.js package.json package-lock.json .npmrc /$pwsModule/
COPY src ./src
COPY config ./config
COPY images ./images
RUN apk --no-cache add ca-certificates \
      bash \
      python \
      make \
      g++ \
      git \
    && adduser -u 1501 -g $pwsModule -s /bin/bash -D -h /$pwsModule $pwsModule \
    && chown -R $pwsModule:$pwsModule /$pwsModule 
USER $pwsModule
################################################################################
FROM BASE as TESTER
COPY .snyk .eslintrc.js ./
RUN npm install --only=prod \
    && npm install --only=dev \
    && npm run snyk-test
################################################################################
FROM BASE as BUILDER
RUN  npm install --production 
################################################################################
FROM node:10.17.0-alpine
ENV pwsModule="ias-gestion-api"
WORKDIR /$pwsModule
COPY --from=BUILDER /$pwsModule/index.js ./
COPY --from=BUILDER /$pwsModule/node_modules ./node_modules
COPY --from=BUILDER /$pwsModule/src ./src
COPY --from=BUILDER /$pwsModule/config ./config
COPY --from=BUILDER /$pwsModule/images ./images
RUN adduser -u 1501 -g $pwsModule -D -h /$pwsModule $pwsModule \
    && chown -R $pwsModule:$pwsModule /$pwsModule 
USER $pwsModule
CMD node ./index.js
