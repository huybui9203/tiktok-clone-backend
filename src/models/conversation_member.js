'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Conversation_member extends Model {
        static associate(models) {
            Conversation_member.belongsTo(models.Conversation, {
                foreignKey: 'conversation_id',
                targetKey: 'id',
                as: 'conversation',
            });

            Conversation_member.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
            });
        }
    }
    Conversation_member.init(
        {
            conversation_id: DataTypes.INTEGER,
            user_id: DataTypes.INTEGER,
            last_viewed_at: DataTypes.DATE,
        },
        {
            sequelize,
            modelName: 'Conversation_member',
        }
    );
    return Conversation_member;
};
