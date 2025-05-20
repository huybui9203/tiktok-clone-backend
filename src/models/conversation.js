'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Conversation extends Model {
        static associate(models) {
            Conversation.hasMany(models.Message, {
                foreignKey: 'conversation_id',
                as: 'messages',
            });

            Conversation.belongsToMany(models.User, {
                through: models.Conversation_member,
                foreignKey: 'conversation_id',
                as: 'members',
                onDelete: 'CASCADE',
            });

            Conversation.hasMany(models.Conversation_member, {
                foreignKey: 'conversation_id',
                as: 'list_members',
            });

            Conversation.belongsToMany(models.User, {
                through: models.Message,
                foreignKey: 'conversation_id',
                as: 'conversation_messages',
                onDelete: 'CASCADE',
            });

            Conversation.belongsTo(models.Message, {
                foreignKey: 'last_msg_id',
                targetKey: 'id',
                as: 'last_message',
                onDelete: 'SET NULL',
            });

            Conversation.belongsTo(models.User, {
                foreignKey: 'creator_id',
                targetKey: 'id',
                as: 'creator',
            });
        }
    }
    Conversation.init(
        {
            name: DataTypes.STRING,
            creator_id: DataTypes.INTEGER,
            avatar: DataTypes.JSON,
            last_msg_id: DataTypes.INTEGER,
            type: DataTypes.ENUM('self', 'direct', 'group'),
            approve_mem: DataTypes.BOOLEAN,
        },
        {
            sequelize,
            modelName: 'Conversation',
        }
    );
    return Conversation;
};
