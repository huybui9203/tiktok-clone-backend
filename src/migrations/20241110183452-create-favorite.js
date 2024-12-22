'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Favorites',
            {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER,
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    references: {
                        model: 'Users',
                        key: 'id',
                    },
                    unique: 'favorite_unique_constraint',
                    onDelete: 'CASCADE',
                },
                video_id: {
                    type: Sequelize.INTEGER,
                    references: {
                        model: 'Videos',
                        key: 'id',
                    },
                    unique: 'favorite_unique_constraint',
                    onDelete: 'CASCADE',
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                },
            },
            {
                uniqueKeys: {
                    favorite_unique_constraint: {
                        fields: ['user_id', 'video_id'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Favorites');
    },
};
