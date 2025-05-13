'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Comments', {
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
            },
            video_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Videos',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            is_author_video: {
                type: Sequelize.BOOLEAN,
            },
            comment: {
                type: Sequelize.STRING,
            },
            parent_id: {
                type: Sequelize.INTEGER,
                references: {
                    model: 'Comments',
                    key: 'id',
                },
                allowNull: true,
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
            path: {
                allowNull: true,
                type: Sequelize.STRING,
            },
            likes_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            replies_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            edited_at: {
                type: Sequelize.DATE,
                defaultValue: null,
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Comments');
    },
    // async up(queryInterface, Sequelize) {
    //     // await queryInterface.addColumn('Comments', 'edited_at', {
    //     //     type: Sequelize.DATE,
    //     //     defaultValue: null,
    //     // });
    // },
};
