'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Report extends Model {
        static associate(models) {
            Report.belongsTo(models.User, {
                foreignKey: 'user_id',
                targetKey: 'id',
                as: 'user',
                onDelete: 'CASCADE',
            });

            Report.belongsTo(models.Video, {
                foreignKey: 'reportable_id',
                targetKey: 'id',
                as: 'video',
                constraints: false,
            });

            Report.belongsTo(models.Comment, {
                foreignKey: 'reportable_id',
                targetKey: 'id',
                as: 'comment',
                constraints: false,
            });

            Report.belongsTo(models.Report_reason, {
                foreignKey: 'reason_id',
                targetKey: 'id',
                as: 'reason',
                onDelete: 'set null',
            });
        }
    }
    Report.init(
        {
            user_id: DataTypes.INTEGER,
            reportable_type: DataTypes.ENUM(
                'video',
                'comment',
                'group',
                'user'
            ),
            reportable_id: DataTypes.INTEGER,
            reason_id: DataTypes.INTEGER,
            is_resolved: DataTypes.BOOLEAN,
            action: DataTypes.ENUM('not', 'delete', 'keep'),
        },
        {
            sequelize,
            modelName: 'Report',
        }
    );
    return Report;
};
