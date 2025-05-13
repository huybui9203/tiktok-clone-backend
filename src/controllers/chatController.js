import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import * as chatService from '~/services/chatService';
import { addUser, io, isUserOnline } from '~/sockets/socket';
import formatDate from '~/utils/formatDate';
import {
    destroyImage,
    uploadChatAvatarToCloud,
    uploadCoverToCloud,
    uploadVideoToCloud,
} from '~/utils/uploadFile';

const sendMessage = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const {
            receiverId,
            conversationId,
            message,
            replyToId,
            conversationType,
            tempId,
        } = req.body;

        const attachments = req.arrayFiles;

        const messageResult = await chatService.sendMessage({
            senderId: currentUserId,
            receiverId,
            conversationId,
            type: conversationType,
            replyToId,
            message,
            creatorId: currentUserId,
            attachments,
        });

        const listMessageResultId = Array.isArray(messageResult)
            ? messageResult.map((msg) => msg.id)
            : [messageResult.id];
        const newMessages =
            await chatService.getListMessageByIds(listMessageResultId);

        if (conversationId) {
            //implements socket io for real time data transfer
            //emit to all devices/tabs of user
            // io.to(`user:${senderId}`).emit('newMessage', newMessage);

            // const receiverSocketId = getReceiverSocketId(receiverId);
            // //emit event for all other participants
            // if (receiverSocketId && receiverSocketId.length > 0) {
            //     receiverSocketId.forEach((id) => {
            //         io.to(id).emit('newMessage', newMessage);
            //     });
            // }

            // const listMembers =
            //     await chatService.getListMemberOfConversation(conversationId);

            // const memberSockets = await io
            //     .in(listMembers.map((id) => `user:${id}`))
            //     .fetchSockets();

            // const sockets = await io
            //     .in(`conversation:${conversationId}`)
            //     .fetchSockets();

            // const memberSocketId = memberSockets.map((socket) => socket.id);
            // const conversationSocketId = sockets.map((socket) => socket.id);

            // const memberOutRoom = memberSocketId.filter(
            //     (socketId) => !conversationSocketId.includes(socketId)
            // );
            // console.log(`member out room ${conversationId}:`, memberOutRoom);
            // console.log(
            //     `member in room  ${conversationId}:`,
            //     conversationSocketId
            // );

            // const notification = {
            //     type: 'message',
            //     userId: currentUserId,
            //     userDetail: '',
            //     videoId: videoData.id,
            //     message:  'new message',
            // };
            // memberOutRoom.forEach((socketId) => {
            //     io.to(socketId).emit('notification', notification);
            // });

            // await new Promise((re) => {
            //     setTimeout(() => {
            //         re();
            //     }, 10000);
            // });
            io.to(`conversation:${conversationId}`)
                // .except(`user:${currentUserId}`)
                .emit('newMessage', { newMessages, tempId });

            io.to(`conversation:${conversationId}`)
                .except(`user:${currentUserId}`)
                .emit('chat-notification', { newMessages, tempId });
            // if (receiverId && receiverId.length > 0) {
            //     receiverId.forEach((id) => {
            //         io.to(`user:${id}`).emit('newMessage', newMessage);
            //     });
            // }
        } else {
            //emit to all devices/tabs of user
            receiverId.push(currentUserId.toString());
            console.log(receiverId);
            const onlineReceivers = receiverId.filter((id) => isUserOnline(id));
            addUser(onlineReceivers, newMessages[0]?.conversation_id);
            const individualRooms = onlineReceivers.map((id) => `user:${id}`);
            io.in(individualRooms).socketsJoin(
                `conversation:${newMessages[0]?.conversation_id}`
            );

            io.to(`conversation:${newMessages[0]?.conversation_id}`).emit(
                'newMessage',
                { newMessages, tempId }
            );

            io.to(`conversation:${newMessages[0]?.conversation_id}`)
                .except(`user:${currentUserId}`)
                .emit('chat-notification', { newMessages, tempId });
        }

        if (!attachments || attachments.length === 0) {
            return res.status(StatusCodes.CREATED).json({
                message: 'success',
                data: newMessages,
            });
        }

        const uploadFns = attachments.map((attachment, index) => {
            if (attachment.type === 'image') {
                return async () => {
                    const [error, image] = await uploadCoverToCloud(
                        attachment.path
                    );
                    fs.unlinkSync(attachment.path);
                    if (error) {
                        throw new ApiError(
                            StatusCodes.INTERNAL_SERVER_ERROR,
                            error.message
                        );
                    }
                    if (message) {
                        return {
                            file_type: 'image',
                            file_path: image.secure_url,
                            message_id: newMessages[index + 1]?.id,
                            meta: {
                                public_id: image.public_id,
                                width: Number(image.width),
                                height: Number(image.height),
                            },
                        };
                    }
                    return {
                        file_type: 'image',
                        file_path: image.secure_url,
                        message_id: newMessages[index]?.id,
                        meta: {
                            public_id: image.public_id,
                            width: Number(image.width),
                            height: Number(image.height),
                        },
                    };

                    // return await new Promise((resolve) => {
                    //     setTimeout(() => {
                    //         if (message) {
                    //             resolve({
                    //                 file_type: 'image',
                    //                 message_id: newMessages[index + 1]?.id,
                    //                 file_path:
                    //                     'https://res.cloudinary.com/dhz498qe4/image/upload/c_fill,g_center,h_120,q_auto,w_120/v1739781930/tiktok-clone/images/sltcdywbd4bzxnj5xyp6.jpg',
                    //                 meta: {
                    //                     // public_id: image.public_id,
                    //                     width: 120,
                    //                     height: 120,
                    //                 },
                    //             });
                    //         } else {
                    //             resolve({
                    //                 file_type: 'image',
                    //                 message_id: newMessages[index]?.id,
                    //                 file_path:
                    //                     'https://res.cloudinary.com/dhz498qe4/image/upload/c_fill,g_center,h_120,q_auto,w_120/v1739781930/tiktok-clone/images/sltcdywbd4bzxnj5xyp6.jpg',
                    //                 meta: {
                    //                     // public_id: image.public_id,
                    //                     width: 120,
                    //                     height: 120,
                    //                 },
                    //             });
                    //         }
                    //     }, 5000);
                    // });
                };
            } else if (attachment.type === 'video') {
                return async () => {
                    const [error, video] = await uploadVideoToCloud(
                        attachment.path
                    );
                    fs.unlinkSync(attachment.path);
                    if (error) {
                        throw new ApiError(
                            StatusCodes.INTERNAL_SERVER_ERROR,
                            error.message
                        );
                    }
                    if (message) {
                        return {
                            file_type: 'video',
                            file_path: video.secure_url,
                            message_id: newMessages[index + 1]?.id,
                            meta: {
                                public_id: video.public_id,
                                width: Number(video.width),
                                height: Number(video.height),
                            },
                        };
                    }
                    return {
                        file_type: 'video',
                        file_path: video.secure_url,
                        message_id: newMessages[index]?.id,
                        meta: {
                            public_id: video.public_id,
                            width: Number(video.width),
                            height: Number(video.height),
                        },
                    };

                    // return await new Promise((resolve) => {
                    //     setTimeout(() => {
                    //         if (message) {
                    //             resolve({
                    //                 file_type: 'video',
                    //                 message_id: newMessages[index + 1]?.id,
                    //                 file_path:
                    //                     'https://res.cloudinary.com/dhz498qe4/video/upload/v1734730902/tiktok-clone/videos/bnu4iedjgpmkne9fkoux.mp4',
                    //                 meta: {
                    //                     // public_id: image.public_id,
                    //                     width: 576,
                    //                     height: 1024,
                    //                 },
                    //             });
                    //         } else {
                    //             resolve({
                    //                 file_type: 'video',
                    //                 message_id: newMessages[index]?.id,
                    //                 file_path:
                    //                     'https://res.cloudinary.com/dhz498qe4/video/upload/v1734730902/tiktok-clone/videos/bnu4iedjgpmkne9fkoux.mp4',
                    //                 meta: {
                    //                     // public_id: image.public_id,
                    //                     width: 576,
                    //                     height: 1024,
                    //                 },
                    //             });
                    //         }
                    //     }, 30000);
                    // });
                };
            }
        });

        const attachmentData = await Promise.all(
            uploadFns.map((uploadFn) => uploadFn())
        );

        const result = await chatService.createAttachments(attachmentData);
        const payload = attachmentData.map((attachment, index) => {
            const { file_type, file_path, meta } = attachment;
            if (message) {
                return {
                    messageId: messageResult[index + 1]?.id,
                    conversationId: newMessages[0]?.conversation_id,
                    attachment: {
                        // id: result[index].id,
                        file_type,
                        file_path,
                        meta,
                    },
                    tempId,
                };
            }
            return {
                messageId: messageResult[index]?.id,
                conversationId: newMessages[0]?.conversation_id,
                attachment: {
                    // id: result[index].id,
                    file_type,
                    file_path,
                    meta,
                },
                tempId,
            };
        });

        // //emit to clients
        io.to(`conversation:${newMessages[0]?.conversation_id}`)
            // .except(`user:${currentUserId}`)
            .emit('updateAttachment', payload);

        if (message) {
            return res.status(StatusCodes.CREATED).json({
                message: 'success',
                data: [
                    ...newMessages.map((message, index) => {
                        if (index > 0) {
                            const { file_type, file_path, meta } =
                                attachmentData[index - 1];
                            return {
                                ...message.toJSON(),
                                attachment: {
                                    id: result[index - 1].id,
                                    file_type,
                                    file_path,
                                    meta,
                                },
                            };
                        }
                        return message;
                    }),
                ],
            });
        }
        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: [
                ...newMessages.map((message, index) => {
                    const { file_type, file_path, meta } =
                        attachmentData[index];
                    return {
                        ...message.toJSON(),
                        attachment: {
                            id: result[index].id,
                            file_type,
                            file_path,
                            meta,
                        },
                    };
                }),
            ],
        });
    } catch (error) {
        next(error);
    }
};

const unsendMessage = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id: messageId } = req.params;
        const [lastMessage, conversationId] = await chatService.unsendMessage(
            Number(messageId),
            currentUserId
        );

        io.to(`conversation:${conversationId}`).emit('unsendMessage', {
            messageId: Number(messageId),
            conversationId,
            lastMessage,
        });

        res.status(StatusCodes.OK).json({
            message: 'success',
            last_message: lastMessage,
        });
    } catch (error) {
        next(error);
    }
};

const reactMessage = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { reactionType, reactionUser, conversationId } = req.body;
        const messageId = Number(id);

        const [created, data] = await chatService.reactMessage(
            messageId,
            reactionType,
            reactionUser,
            currentUserId
        );

        io.to(`conversation:${conversationId}`).emit('reactMessage', {
            messageId,
            conversationId,
            data,
        });

        const statusCode = created ? StatusCodes.CREATED : StatusCodes.OK;
        return res.status(statusCode).json(data);
    } catch (error) {
        next(error);
    }
};

const removeReaction = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id, reactionId } = req.params;
        const { conversationId } = req.query;
        const messageId = Number(id);
        const reactionStat = await chatService.removeReaction(
            messageId,
            currentUserId,
            Number(reactionId)
        );

        io.to(`conversation:${conversationId}`).emit('removeReaction', {
            messageId,
            conversationId: Number(conversationId),
            reactionId: Number(reactionId),
            reactionStat,
        });

        res.status(StatusCodes.OK).json({
            message: 'deleted successfully',
            reaction_id: reactionId,
            reaction_stat: reactionStat,
        });
    } catch (error) {
        next(error);
    }
};

const getListReactions = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { lastTime, lastId, type } = req.query;
        const { id } = req.params;
        const perPage = 15;
        const messageId = Number(id);
        const dateTimeValue = formatDate(Number(lastTime));
        const { listReactions, count } = await chatService.getListReactions(
            dateTimeValue,
            lastId,
            type,
            messageId,
            currentUserId,
            perPage
        );
        return res.status(StatusCodes.OK).json({
            data: listReactions,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    page_count: listReactions.length,
                    next_cursor:
                        listReactions.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listReactions.at(-1)?.updatedAt
                                  ).getTime(),
                                  last_id: listReactions.at(-1)?.id,
                              },
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListConversations = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page: currentPage } = req.query;
        const perPage = 10;
        const [listConversations, conversationCount] =
            await chatService.getListConversations(
                currentUserId,
                currentPage,
                perPage
            );
        res.status(StatusCodes.OK).json({
            data: listConversations,
            meta: {
                pagination: {
                    total: conversationCount,
                    per_page: perPage,
                    total_pages: Math.ceil(conversationCount / perPage),
                    current_page: Number(currentPage),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListMessages = async (req, res, next) => {
    try {
        const { id: conversationId } = req.params;
        const { lastTime, lastId } = req.query;
        const perPage = 15;
        const dateTimeValue = formatDate(Number(lastTime));

        const { listMessages, count } = await chatService.getListMessages(
            dateTimeValue,
            lastId,
            Number(conversationId),
            perPage
        );
        res.status(StatusCodes.OK).json({
            data: listMessages,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    page_count: listMessages.length,
                    next_cursor:
                        listMessages.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listMessages.at(-1)?.createdAt
                                  ).getTime(),
                                  last_id: listMessages.at(-1)?.id,
                              },
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const checkPrivateConversation = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { include: userId } = req.query;
        const conversation = await chatService.checkPrivateConversation(
            currentUserId,
            Number(userId)
        );
        res.status(StatusCodes.OK).json(conversation);
    } catch (error) {
        next(error);
    }
};

const searchConversation = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { page: currentPage, q: searchStr } = req.query;
        const perPage = 10;
        const [listConversations, conversationCount] =
            await chatService.searchConversation(
                currentUserId,
                currentPage,
                perPage,
                searchStr
            );
        res.status(StatusCodes.OK).json({
            data: listConversations,
            meta: {
                pagination: {
                    total: conversationCount,
                    per_page: perPage,
                    total_pages: Math.ceil(conversationCount / perPage),
                    current_page: Number(currentPage),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListAttachmentsOfConversation = async (req, res, next) => {
    try {
        const { lastTime, lastId } = req.query;
        const { id: conversationId } = req.params;
        const perPage = 15;
        const dateTimeValue = formatDate(Number(lastTime));

        const { listAttachments, count } =
            await chatService.getListAttachmentsOfConversation(
                dateTimeValue,
                lastId,
                Number(conversationId),
                perPage
            );

        res.status(StatusCodes.OK).json({
            data: listAttachments,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    next_cursor:
                        listAttachments.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listAttachments.at(-1)?.message?.createdAt
                                  ).getTime(),
                                  last_id: listAttachments.at(-1)?.id,
                              },
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getListMembersOfConversation = async (req, res, next) => {
    try {
        const { lastTime, lastId } = req.query;
        const { id: conversationId } = req.params;
        const perPage = 15;
        const dateTimeValue = formatDate(Number(lastTime));

        const { listMembers, count } =
            await chatService.getListMemberOfConversation(
                dateTimeValue,
                lastId,
                Number(conversationId),
                perPage
            );

        res.status(StatusCodes.OK).json({
            data: listMembers,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    next_cursor:
                        listMembers.length < perPage
                            ? null
                            : {
                                  last_time: new Date(
                                      listMembers.at(-1)?.createdAt
                                  ).getTime(),
                                  last_id: listMembers.at(-1)?.id,
                              },
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateLastViewedChat = async (req, res, next) => {
    try {
        // await new Promise((r) => {
        //     setTimeout(r, 5000);
        // });
        const currentUserId = req.currentUser?.sub;
        const { id: conversationId } = req.params;
        const { lastViewedAt, status } = req.body;
        const unreadMessageCount = await chatService.updateLastViewedChat(
            currentUserId,
            Number(conversationId),
            lastViewedAt,
            status
        );
        const data = {
            last_viewed_at: lastViewedAt,
            conversation_id: Number(conversationId),
            status,
        };
        if (status === 'joined') {
            data.read_count = unreadMessageCount;
        }
        res.status(StatusCodes.OK).json({
            message: 'success',
            data,
        });
    } catch (error) {
        next(error);
    }
};

const getUnreadMessageCount = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const unreadMessage =
            await chatService.getUnreadMessageCount(currentUserId);
        res.status(StatusCodes.OK).json({
            data: {
                unread_msg_count: unreadMessage[0]?.count,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getMember = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const member = await chatService.getMember(currentUserId, Number(id));
        res.status(StatusCodes.OK).json({
            data: {
                member,
            },
        });
    } catch (error) {
        next(error);
    }
};

const customizeConversation = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { name, publicId, type } = req.body;
        const avatar_url = req.filePath;

        let updateData = {};
        if (avatar_url) {
            const uploadImage = async () => {
                const [error, image] =
                    await uploadChatAvatarToCloud(avatar_url);
                fs.unlinkSync(avatar_url);
                if (error) {
                    throw new ApiError(
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        error.message
                    );
                }
                return {
                    url: image.secure_url,
                    public_id: image.public_id,
                };
            };

            const destroyOldImage = async () => {
                if (publicId) {
                    await destroyImage(publicId);
                }
            };

            const [avatar] = await Promise.all([
                uploadImage(),
                destroyOldImage(),
            ]);

            updateData.avatar = avatar;
        }

        if (name) {
            updateData.name = name;
        }

        const conversationId = Number(id);
        await chatService.customizeConversation(
            conversationId,
            updateData,
            type
        );

        res.status(StatusCodes.OK).json({
            data: updateData,
        });
    } catch (error) {
        next(error);
    }
};

const getSuggestedUsers = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { q: searchStr, page } = req.query;
        const conversationId = Number(id);
        const perPage = 10;
        const { listSuggested, count } = await chatService.getSuggestedUsers(
            conversationId,
            currentUserId,
            searchStr,
            page,
            perPage
        );
        res.status(StatusCodes.OK).json({
            data: listSuggested,
            meta: {
                pagination: {
                    total: count,
                    per_page: perPage,
                    total_pages: Math.ceil(count / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const addMembers = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { memberIds } = req.body;
        const conversationId = Number(id);
        await chatService.addMembers(conversationId, currentUserId, memberIds);

        // io.to(memberIds.map((id) => `user:${id}`)).emit('join-conversation', {
        //     conversationId,
        //     memberIds,
        // });
        const { name, members_count, avatar } =
            await chatService.getConversationNameAndMemberCount(
                currentUserId,
                conversationId
            );

        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: {
                name,
                avatar,
                members_count,
            },
        });
    } catch (error) {
        next(error);
    }
};

const leaveConversation = async (req, res, next) => {
    try {
        const currentUserId = req.currentUser?.sub;
        const { id } = req.params;
        const { memberIds } = req.body;
        const conversationId = Number(id);
        await chatService.leaveConversation(
            conversationId,
            currentUserId,
            memberIds
        );

        const { name, members_count, avatar } =
            await chatService.getConversationNameAndMemberCount(
                currentUserId,
                conversationId
            );

        res.status(StatusCodes.OK).json({
            message: 'success',
            data: {
                name,
                avatar,
                members_count,
            },
        });
    } catch (error) {
        next(error);
    }
};

export {
    sendMessage,
    unsendMessage,
    reactMessage,
    removeReaction,
    getListReactions,
    getListConversations,
    getListMessages,
    checkPrivateConversation,
    searchConversation,
    getListAttachmentsOfConversation,
    getListMembersOfConversation,
    updateLastViewedChat,
    getUnreadMessageCount,
    getMember,
    customizeConversation,
    getSuggestedUsers,
    addMembers,
    leaveConversation,
};
