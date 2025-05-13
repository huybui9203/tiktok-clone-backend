'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Reaction extends Model {
        static associate(models) {
            Reaction.belongsTo(models.Message, {
                foreignKey: 'reactable_id',
                constraints: false,
            });

            Reaction.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'reaction_by',
                onDelete: 'CASCADE',
            });
        }
    }
    Reaction.init(
        {
            user_id: DataTypes.INTEGER,
            reactable_id: DataTypes.INTEGER,
            reactable_type: DataTypes.ENUM('message'),
            type: DataTypes.ENUM('like', 'love', 'haha', 'sad', 'angry'),
        },
        {
            sequelize,
            modelName: 'Reaction',
        }
    );
    return Reaction;
};
