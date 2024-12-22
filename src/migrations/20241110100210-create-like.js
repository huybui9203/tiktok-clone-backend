'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Likes', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
                unique: 'like_unique_constraint',
                onDelete: 'CASCADE'
            },
            likeable_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: 'like_unique_constraint',
            },
            likeable_type: {
                type: Sequelize.ENUM('video', 'comment'),
                allowNull: false,
                unique: 'like_unique_constraint',
            },
            owner_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        }, {
            uniqueKeys: {
                like_unique_constraint: {
                    fields: ['user_id', 'likeable_id', 'likeable_type'],
                }
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Likes');
    },
};
