import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import env from '~/config/environment';
import db from '~/models';
import { where } from 'sequelize';
import * as chatService from '~/services/chatService';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin:
            env.BUILD_MODE === 'development'
                ? ['http://localhost:3000']
                : false,
        methods: ['GET', 'POST'],
    },
});

const userSocketMap = {}; //store socket ids corresponding the user id
const roomSocketMap = {}; //store room ids corresponding the user id

const getReceiverSocketId = (receiverId = []) => {
    return receiverId.map((id) => userSocketMap[id]);
};

io.on('connection', async (socket) => {
    const userId = socket.handshake.query.userId;
    console.log('>>>>>.NEW', socket.id);
    if (userId) {
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set([socket.id]);
        } else {
            userSocketMap[userId].add(socket.id);
        }
        console.log(
            `UserId: ${userId}, SocketId: ${socket.id} connected: Connections: ${Array.from(userSocketMap[userId])}`
        );

        //begin test
        socket.join(`user:${userId}`);

        try {
            //join all conversation rooms of the user even if user reconnects
            const listConversationIds = await getAllConversationOfUser(userId);
            listConversationIds.forEach((conversationId) => {
                socket.join(`conversation:${conversationId}`);
                if (!roomSocketMap[conversationId]) {
                    roomSocketMap[conversationId] = new Set([userId]);
                } else {
                    roomSocketMap[conversationId].add(userId);
                }
            });

            console.log('1.', userId, roomSocketMap);
            console.log('>>>>>>>>>.', userSocketMap);

            // listConversationIds.forEach((conversationId) => {
            //     io.to(`conversation:${conversationId}`).emit(
            //         'getStatus',
            //         listConversationIds.map((id) => ({
            //             id,
            //             isOnline: roomSocketMap[id]?.size >= 2,
            //         }))
            //     );
            //     // io.emit('getStatus', roomSocketMap[conversationId]?.size >= 2)
            // });
            const rooms = listConversationIds.map(
                (conversationId) => `conversation:${conversationId}`
            );
            io.to(rooms).emit(
                'getStatus',
                listConversationIds.map((id) => ({
                    id,
                    isOnline: roomSocketMap[id]?.size >= 2,
                }))
            );
        } catch (error) {
            console.log('>>>>>>', error);
        }

        //end test
    }

    // to all connected clients
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on('getConversationStatus', (conversationId, isOnline) => {
        console.log('2.', userId, roomSocketMap);
        if (conversationId) {
            isOnline(roomSocketMap[conversationId]?.size >= 2);
        }
    });

    socket.on('seen', async ({ conversationId, userId, lastViewedAt }) => {
        //update last view
        await chatService.updateLastViewedChat(
            userId,
            conversationId,
            lastViewedAt,
            'seen'
        );
    });

    socket.on('disconnect', async () => {
        if (userId) {
            //if userId has greater than 1 connection
            if (userSocketMap[userId]?.size > 1) {
                userSocketMap[userId].delete(socket.id);
            } else {
                delete userSocketMap[userId];
            }
            console.log(
                `UserId: ${userId}, SocketId: ${socket.id} disconnected: Connections: ${userSocketMap[userId] && Array.from(userSocketMap[userId])}`
            );

            try {
                const listConversationIds =
                    await getAllConversationOfUser(userId);
                listConversationIds.forEach((conversationId) => {
                    if (
                        roomSocketMap[conversationId] &&
                        !userSocketMap[userId]
                    ) {
                        roomSocketMap[conversationId].delete(userId);
                    }
                });

                console.log('3.', userId, roomSocketMap);
                const sockets = await io.in(`conversation:${2}`).fetchSockets();
                console.log('>>>>>>>>>>>', [...sockets].length);
                for (const socket of sockets) {
                    console.log('>>>>>>>>k', socket.id);
                }
                // listConversationIds.forEach((conversationId) => {
                //     io.to(`conversation:${conversationId}`).emit(
                //         'getStatus',
                //         listConversationIds.map((id) => ({
                //             id,
                //             isOnline: roomSocketMap[id]?.size >= 2,
                //         }))
                //     );
                // });
                const rooms = listConversationIds.map(
                    (conversationId) => `conversation:${conversationId}`
                );
                io.to(rooms).emit(
                    'getStatus',
                    listConversationIds.map((id) => ({
                        id,
                        isOnline: roomSocketMap[id]?.size >= 2,
                    }))
                );
            } catch (error) {
                console.log('>>>>>>', error);
            }
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

const getAllConversationOfUser = async (userId) => {
    const listConversations = await db.Conversation_member.findAll({
        where: {
            user_id: userId,
            status: 'approved',
        },
        attributes: ['conversation_id'],
    });
    return listConversations?.map(
        (conversation) => conversation.conversation_id
    );
};

const addUser = (listUserIds, conversationId) => {
    if (!roomSocketMap[conversationId]) {
        roomSocketMap[conversationId] = new Set(listUserIds);
    } else {
        listUserIds.forEach((userId) => {
            roomSocketMap[conversationId].add(userId);
        });
    }
};

const isUserOnline = (userId) => {
    return userSocketMap[userId];
};

export { app, server, io, getReceiverSocketId, addUser, isUserOnline };
