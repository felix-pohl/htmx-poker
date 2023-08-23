FROM debian:stable-slim as builder

ARG NODE_VERSION=18.16.0

RUN apt-get update; apt install -y curl
RUN curl https://get.volta.sh | bash
ENV VOLTA_HOME /root/.volta
ENV PATH /root/.volta/bin:$PATH
RUN volta install node@${NODE_VERSION}

#######################################################################

RUN mkdir /app
WORKDIR /app

ENV NODE_ENV production

COPY . .

RUN npm install
RUN npm run build

FROM debian:stable-slim

LABEL fly_launch_runtime="nodejs"

COPY --from=builder /root/.volta /root/.volta
COPY --from=builder /app/out /app
COPY --from=builder /app/src/static /app/static

WORKDIR /app
ENV NODE_ENV production
ENV PATH /root/.volta/bin:$PATH