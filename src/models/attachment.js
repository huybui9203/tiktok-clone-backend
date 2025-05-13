'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Attachment extends Model {
    static associate(models) {
      Attachment.belongsTo(models.Message, {
        foreignKey: 'message_id',
        targetKey: 'id',
        as: 'message',
        onDelete: 'CASCADE',
      })
    }
  }
  Attachment.init({
    file_type: DataTypes.STRING,
    file_path: DataTypes.STRING,
    message_id: DataTypes.INTEGER,
    meta: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'Attachment',
  });
  return Attachment;
};