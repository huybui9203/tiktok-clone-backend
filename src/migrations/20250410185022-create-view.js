'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            'Views',
            {
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
                    onDelete: 'CASCADE',
                    unique: 'view_unique_constraint',
                },
                video_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'Videos',
                        key: 'id',
                    },
                    onDelete: 'CASCADE',
                    unique: 'view_unique_constraint',
                },
                duration: {
                    type: Sequelize.INTEGER,
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
                    view_unique_constraint: {
                        fields: ['user_id', 'video_id', 'createdAt'],
                    },
                },
            }
        );
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Views');
    },

    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Views', 'view_number', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
        });
        // await queryInterface.addConstraint('Views', {
        //     type: 'unique',
        //     fields: ['user_id', 'video_id', 'view_number'],
        //     name: 'view_number_unique_constraint',
        // });
    },
};
