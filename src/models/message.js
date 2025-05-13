'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Message extends Model {
        static associate(models) {
            Message.belongsTo(models.Conversation, {
                foreignKey: 'conversation_id',
                targetKey: 'id',
                as: 'conversation',
                onDelete: 'CASCADE',
            });

            Message.belongsTo(models.User, {
                foreignKey: 'sender_id',
                targetKey: 'id',
                as: 'sender',
                onDelete: 'SET NULL',
            });

            Message.hasMany(models.Message, {
                foreignKey: 'reply_to_id',
                as: 'reply_messages',
            });

            Message.belongsTo(models.Message, {
                foreignKey: 'reply_to_id',
                targetKey: 'id',
                as: 'reply_to',
                onDelete: 'SET NULL',
            });

            Message.hasOne(models.Conversation, {
                foreignKey: 'last_msg_id',
            })

            Message.hasOne(models.Attachment, {
                foreignKey: 'message_id',
                as: 'attachment',
            });

            Message.belongsToMany(models.User, {
                through: {
                    model: models.Reaction,
                    unique: false,
                    scope: { reactable_type: 'message' },
                },
                as: 'reacted_users',
                foreignKey: 'reactable_id',
                constraints: false,
            });

            Message.hasMany(models.Reaction, {
                foreignKey: 'reactable_id',
                constraints: false,
                scope: {
                    reactable_type: 'message',
                },
                as: 'reactions'
            });
        }
    }
    Message.init(
        {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            content: DataTypes.TEXT,
            sender_id: DataTypes.INTEGER,
            conversation_id: DataTypes.INTEGER,
            shared_data: DataTypes.JSON,
            reply_to_id: DataTypes.INTEGER,
            type: DataTypes.ENUM('text', 'attachment', 'shared_post')
        },
        {
            sequelize,
            modelName: 'Message',
        }
    );
    return Message;
};
