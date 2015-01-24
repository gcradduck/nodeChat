
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
var roomsCreated = [];

exports.listen = function(server) {
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {

		guestNumber = assignGuestName(socket, guestNumber,
									nickNames, namesUsed);
		joinRoom(socket, 'Lobby');

		handleMessageBroadcasting(socket, nickNames);

		handleNameChangeAttempts(socket, nickNames, namesUsed);

		handleRoomJoining(socket);
		
		handleRoomLeaving(socket);

		socket.on('rooms', function() {
			
			//socket.emit('rooms', io.sockets.manager.rooms);
			
			var tmpRooms = socket.rooms;
			
			console.log("chat_server.js - 30 - tmpRooms: " + tmpRooms + " / " + tmpRooms.length);
			var adapterRooms = io.sockets.adapter.rooms;
			
			console.log("chat_server.js - 33 - adapterRooms: " + adapterRooms + " / " + adapterRooms);
			
			socket.emit('rooms', roomsCreated);
			//io.emit('rooms', socket.rooms);
			//socket.to(socket).emit('rooms', socket.rooms);
			/*
			for(var i = 0; i < tmpRooms.length; i++)
			{
				//socket.to(tmpRooms[i]).emit('rooms', socket.rooms);
				//console.log("socket.rooms[" + i + "]: " + socket.rooms[i]);
				//socket.rooms[i].emi
				socket.to(socket.rooms[i]).emit('rooms', socket.rooms);
				
			}
			*/
			//socket.emit('rooms', socket.rooms);
			
			//socket.emit('rooms', tmpRooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed)
{
	var name = 'Guest ' + guestNumber;

	nickNames[socket.id] = name;
	
	socket.emit('nameResult', {
		success: true,
		name: name
	});

	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room) {

	if(roomsCreated.indexOf(room) == -1)
	{
		roomsCreated.push(room);
	}
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});

	
	var usersInRoom = io.sockets.adapter.rooms[room];
	console.log("chat_server.js - usersInRoom: " + usersInRoom);
	//var usersInRoom = io.sockets.clients(room);
	//if(usersInRoom && usersInRoom.length > 1)
	
	if(usersInRoom)
	{
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		var userCount = 0;
		for (var index in usersInRoom) {
			userCount++;
			//var userSocketId = usersInRoom[index].id;
			var userSocketId = index;
			console.log("userSocketId: " + userSocketId + " / " + socket.id);
			
			if (userSocketId && (typeof userSocketId != 'undefined') && (userSocketId != socket.id) ) {
				
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				if(nickNames[userSocketId])
				{
					usersInRoomSummary += nickNames[userSocketId];
				}
			}
		}
		usersInRoomSummary += '.';
		if(userCount > 1)
		{
			socket.emit('message', {text: usersInRoomSummary});
		} else {
			socket.emit('message', {text: "Empty room - you have the place to yourself."});
		}
	}
	
	

}


function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name) {
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		}
		else {
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];

				socket.emit('nameResult', {
					success: true,
					name: name
				});

				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleRoomLeaving(socket) {
	socket.on('leave', function(currentRoom) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, "Lobby");
	});
}

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

