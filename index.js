const users = {};
const PORT = 3333;
const INDEX = "/index.html";

const http = require("http");
const express = require("express");
const app = express();

const server = http.createServer(app);

app.use((req, res) => res.sendFile(INDEX, { root: __dirname }));

const io = require("socket.io")(server, {
  transports: ["websocket", "polling"],
  origin: ["http://localhost:3001", "http://localhost:3000"],
});

io.on("connection", (client) => {
  client.on("username", ([username]) => {
    const room = (
      Math.floor(Math.random() * (999999 - 111111)) + 111111
    ).toString();

    client.room = room;
    client.isAdmin = true;

    const user = {
      name: username,
      id: client.id,
      room: room,
      isAdmin: true,
      points: 0,
    };

    users[room] = { [client.id]: user };
    client.join(room);

    io.to(room).emit("connected", user);
    io.to(room).emit("users", Object.values(users[room]));

    console.log(users);
  });

  client.on("nickname", ([username, room, nickname]) => {
    console.log("Nickname");

    const user = {
      name: username,
      id: client.id,
      room: room,
      isAdmin: false,
      points: 0,
      nickname: nickname,
    };

    client.room = room;
    users[room] = { ...users[room], [client.id]: user };
    client.join(room);
    io.to(room).emit("connected", user);
    io.to(room).emit("users", Object.values(users[room]));
  });

  client.on("join", ([username, room]) => {
    if (users[room]) {
      console.log("exists");
      client.emit("enterNickname", [username, room]);
    } else {
      console.log("doesnt exist");
      client.emit("error", "You don't have access to this room");
    }

    console.log(users);
  });

  client.on("send", (message) => {
    console.log(message);
    io.to(client.room).emit("message", {
      text: message,
      user: client.id,
    });

    console.log(users);
  });

  client.on("answer", ([name, points]) => {
    console.log(users);
    console.log(name.email, points);
    if (users[client.room]) {
      console.log('I EXIST');
      Object.values(users[client.room]).forEach((item) => {
        if (item.name === name.email) {
          console.log(item.points);
          console.log("CORRECT");
          item.points = item.points + points;
        }
      });
      io.to(client.room).emit("users", Object.values(users[client.room]));
    }
  });

  client.on("start-game", (title) => {
    io.to(client.room).emit("starting", title);
    console.log(client.room, "starting");
  });

  client.on("skip", () => {
    io.to(client.room).emit("next");
  });
  client.on("board", () => {
    io.to(client.room).emit("toggleBoard");
  });
  client.on("finish", () => {
    io.to(client.room).emit("allFinish");
  });

  client.on("disconnect", () => {
    if (client.isAdmin) {
      delete users[client.room];
    } else {
      if (users && users[client.room]) {
        delete users[client.room][client.id];
        io.to(client.room).emit("users", Object.values(users[client.room]));
        client.leave(client.room);
        delete client.room;
      }
    }
    io.to(client.room).emit("disconnected", client.id);
    console.log(users);
  });

  // client.on("leave", () => {
  //   delete users[client.room][client.id];
  //   io.to(client.room).emit("users", Object.values(users[client.room]));
  //   if (Object.keys(users[client.room]).length <= 0) {
  //     delete users[client.room];
  //   }
  //   client.leave(client.room);
  //   delete client.room;
  // });
});

server.listen(process.env.PORT || PORT);
