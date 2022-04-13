// Require the packages we will use:
const http = require("http"),
    fs = require("fs");

const port = 3456;
const file = "client.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// Arrays that will store all users, user info, global chat, and rooms on server
let users = [];
let usersInfo = [];
let rooms = [];
let logUsers = [];
let globalChatLog = [];

// Create objects to store user and room information
let User = function(username, password, socketId){
    this.username = username; // username
    this.password = password; // password
    this.socketId = socketId; // socket ID
    this.rooms = [];          // list of rooms they have made 
}
let Room = function(roomName, host, password){
    this.roomName = roomName; // room name
    this.host = host;         // room host
    this.password = password; // password (optional)
    this.users = [];          // list of users in room
    this.chatLog = [];        // chat log
    this.banList = [];
}

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // On user disconnect, log out user
    socket.on("disconnect", function(data){
        console.log(socket.username);
        if (socket.username != undefined)
        {
            logUsers.splice(logUsers.indexOf(socket.username), 1);
        }
	});

    // Runs when server receives new attempt to logout signed in user from client.
    socket.on("logout_user_to_server", function(data)
    {
        console.log("Logout attempt from: " + socket.username);
        // User has to exist and be logged in too
        if (socket.username != undefined)
        {
            // Remove user from array of logged in users
            logUsers.splice(logUsers.indexOf(socket.username), 1);
            
            socket.leave(socket.room)
            socket.room = null;
            // Alert client that they logged out successfuly
            socket.emit("logoutSuccess", "");
        }
        else
        {
            socket.emit("logoutFail", "");
        }
    });


    // Runs when server receives new attempt to login new user from client.
    socket.on("login_user_to_server", function(data)
    {
        // Check if username exists 
        if (!users.includes(data.user))
        {
            socket.emit("loginFail", {result : "inv_user"});
        }
        else if (data.user == "")
        {
            // If username field is empty, then you have failed to register
            socket.emit("loginFail", {result : "emp_user"});
        }
        else if (data.pass == "")
        {
            // If password field is empty, then you have failed to register
            socket.emit("loginFail", {result : "emp_pass"});
        }
        else
        {
            socket.username = data.user;

            // Then check if password matches user
            let pass = usersInfo.find(x => x.username == data.user);
            if (pass.password != data.pass)
            {
                // Wrong password given
                socket.emit("loginFail", {result : "inv_pass"});
            }
            else if (logUsers.includes(pass))
            {
                socket.emit("loginFail", {result : "dup_user"});
            }
            else
            {
                // Right password given for user, so log them in
                logUsers.push(pass);
                socket.emit("updateRoomList", rooms);
                socket.emit("loginSuccess", {user : data.user});
                socket.emit("global_message_to_client", globalChatLog) // broadcast the message to other users
            }
        }
    });

    // Runs when server receives new attempt to register new account from client.
    socket.on("new_user_to_server", function(data)
    {
        if (users.includes(data.user))
        {
            // If username already exists, then you have failed to register
            socket.emit("registerFail", {result : "dup"});
        } 
        else if (data.user == "")
        {
            // If username field is empty, then you have failed to register
            socket.emit("registerFail", {result : "emp_user"});
        }
        else if (data.pass == "")
        {
            // If password field is empty, then you have failed to register
            socket.emit("registerFail", {result : "emp_pass"});
        }
        else
        {
            // Else add new user
            socket.username = data.user;
            socket.password = data.pass;
            socket.room = null;
            let newUser = new User(data.user, data.pass, socket.id);

            // Update arrays
            users.push(data["user"]);
            usersInfo.push(newUser);
            socket.emit("registerSuccess", rooms);
        }
    });

    // Requesting the server to create a chat room
    socket.on('room_request_to_server', function(data)
    {
        console.log("Creating room: " + data["roomTitle"]);
        if (data["roomTitle"] == "")
        {
            socket.emit("emptyRoomName", "");
        }
        else
        {
            let exist = rooms.find(x => x.roomName == data["roomTitle"]);
            if (exist)
            {
                // Cannot create room because room name already exists
                socket.emit("existingRoom", "");
            }
            else
            {
                // Create a new room and add to room array
                let user = data["user"];
                let name = data["roomTitle"];
                let pwd = data["roomPassword"];
                let new_room = new Room(name, user, pwd, []);
                new_room.users.push(user);
                rooms.push(new_room);

                // Push newly created room into user info
                let host = usersInfo.find(x => x.username == data.user);
                host.rooms.push(new_room);

                // Let client know to update rooms they own visually and that they have created a room
                socket.emit("update_host_rooms", host.rooms);
                socket.emit("create_success", "");

                // Let client know to update room list 
                io.sockets.emit("updateRoomList", rooms);
            }
        }
    });

    socket.on('join_room_request_to_server', function(data){
        for(let i = 0; i < rooms.length; ++i){
            if (data["roomData"] == rooms[i].roomName){
                console.log("banned: "+ rooms[i].banList);
                socket.room = rooms[i];
                if (!(rooms[i].users.includes(socket.username))){
                    rooms[i].users.push(socket.username);
                }
                socket.join(data["roomData"]);
                io.in(socket.room.roomName).emit("roomusers", socket.room);
                io.sockets.emit("updateRoomList", rooms);

                // Update chat log
                socket.emit("update_chat_room", socket.room.chatLog);
            }
        }
    });

    // Runs when the server receives a new message from the client.
    socket.on('message_to_server', function (data) {
        console.log("user: " + data["user"]);
        console.log("message: " + data["message"]); // log it to the Node.JS output
        console.log("room: " + data["roomInfo"]); // log it to the Node.JS output

        // Update chat log
        let room = rooms.find(x => x.roomName == data["roomInfo"]);
        room.chatLog.push([data["user"],"public", data["message"]]);
        
        io.in(data["roomInfo"]).emit("message_to_client", { user: data["user"],message: data["message"] }) // broadcast the message to other users
    });

    socket.on('private_message', function (data){
        let sender = data["send"];
        let recipient = data["receive"];
        let curr_room = data["room"];
        let msg = data["pm"];

        console.log(sender + "to " + recipient + " in " + curr_room.roomName + " about " + msg);
        let room = rooms.find(x => x.roomName == curr_room.roomName);
        room.chatLog.push([sender, recipient, msg]);
        console.log(room.chatLog);
        io.in(data["room"].roomName).emit("update_chat_room", room.chatLog);

    });

    // Global message request from client
    socket.on('global_message_to_server', function (data) {
        // Runs when the server receives a new message from the client.
        console.log("user: " + data["user"]);
        console.log("message: " + data["message"]); // log it to the Node.JS output

        globalChatLog.push(data["user"] + ": " + data["message"]);
        io.sockets.emit("global_message_to_client", globalChatLog) // broadcast the message to other users
    });

    socket.on("leave_request_to_server", function (data){
        for (let i = 0; i < rooms.length; ++i){
            if (rooms[i].roomName == data["room"]){
                socket.room = null;
                rooms[i].users.splice(rooms[i].users.indexOf(socket.username),1);
                io.in(data["room"]).emit("roomusers", rooms[i]);
            }
        }
        socket.leave(data["room"]);
        io.sockets.emit("updateRoomList", rooms);
    });

    // Client request to delete chat room 
    socket.on("delete_request_to_server", function(data){
        // Find room to delete
        let room = rooms.find(x => x.roomName == data["room"]);
        let host = usersInfo.find(x => x.username == data.user);
        
        // Kick everyone currently in the chat room
        while(room.users.length > 0)
        {
            // Get username from everyone in room
            let user = room.users[0];
            
            // Find their info
            let info = usersInfo.find(x => x.username == user);

            // Get their socketId
            let id = info.socketId;

            io.to(id).emit('userKick', room);

            // Delete from that room's user list
            room.users.splice(0, 1);
        }

        // Remove room from rooms array stored by server
        rooms.splice(rooms.indexOf(room), 1);
        host.rooms.splice(host.rooms.indexOf(data["room"]), 1);

        // Update room list visually
        io.sockets.emit("updateRoomList", rooms);
        socket.emit("update_host_rooms", host.rooms);

        // Let user know that room was deleted
        socket.emit("delete_success", "");
    });

    // Client request to kick user from chat room
    socket.on("kick_request_to_server", function(data){
        let kickedUser = data["kick"];
        let kickedRoom = data["room"];
        let kickedUserID = null;

        for (let i=0; i<usersInfo.length; i++){
			if (usersInfo[i].username == kickedUser){
				kickedUserID = usersInfo[i].socketId;
			}
		}
        io.to(kickedUserID).emit('userKick', kickedRoom);

        for(let i=0; i<rooms.length; i++){
			if(rooms[i].roomName == data.roomName){
				rooms[i].users.splice(rooms[i].users.indexOf(kickedUser),1);
			}
		}

        io.in(socket.room.roomName).emit("roomusers", socket.room);
    });

    socket.on("ban_request_to_server", function(data){
        let banUser = data["ban"];
        let banRoom = data["room"];
        for(let i=0; i<rooms.length; i++){
            if(rooms[i].roomName == banRoom.roomName){
                rooms[i].banList.push(banUser);
            }
        }
        if (banRoom.users.includes(banUser)){
            // console.log(banUser);
            // console.log(banRoom.roomName);
            let bannedUserID = null;
            for (let i=0; i<usersInfo.length; i++){
                if (usersInfo[i].username == banUser){
                    // console.log(usersInfo[i].username);
                    bannedUserID = usersInfo[i].socketId;
                }
            }
            io.to(bannedUserID).emit('userKick', banRoom);
            for(let i=0; i<rooms.length; i++){
                if(rooms[i].roomName == data.roomName){
                    rooms[i].users.splice(rooms[i].users.indexOf(banUser),1);
                }
            }
            io.in(socket.room.roomName).emit("roomusers", socket.room);
        } 
    });
});