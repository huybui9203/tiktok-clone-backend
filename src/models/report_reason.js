'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Report_reason extends Model {
        static associate(models) {
            Report_reason.hasMany(models.Report, {
                foreignKey: 'reason_id',
                as: 'report',
            });
        }
    }
    Report_reason.init(
        {
            text: DataTypes.STRING,
            action: DataTypes.JSON,
        },
        {
            sequelize,
            modelName: 'Report_reason',
        }
    );
    return Report_reason;
};
