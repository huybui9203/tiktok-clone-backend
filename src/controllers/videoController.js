import ApiError from '~/utils/ApiError';
import { v4 as uuidv4 } from 'uuid';
import {
    videoMulterUpload,
    uploadImageToCloud,
    uploadVideoToCloud,
    imageMulterUpload,
    uploadCoverToCloud,
} from '~/utils/uploadFile';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import * as videoServices from '~/services/videoServices';
console.log(path.join(__dirname, '..', 'public', 'video', 'abc.mp4'));

const uploadVideo = (req, res, next) => {
    // this route don't have validated yet
    videoMulterUpload(req, res, (err) => {
        if (!req.file) {
            next(new ApiError(StatusCodes.BAD_REQUEST, 'No file provided'));
            return;
        }
        if (err instanceof multer.MulterError) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        } else if (err) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        }
        // const { file } = req;
        // if (fs.existsSync(file.path)) {
        //     fs.unlinkSync(file.path);
        // }
        const { chunk, uploadId } = req.query;
        const { totalChunks } = req.body;
        if (+chunk === +(totalChunks - 1)) {
            // const { path } = req.file;
            const finalPath = `src/public/videos/${uploadId}.final.mp4`;
            const writeStream = fs.createWriteStream(finalPath);

            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(
                    'src/public/videos',
                    `${uploadId}.part${i}.mp4`
                );
                const data = fs.readFileSync(chunkPath);
                writeStream.write(data);
                fs.unlinkSync(chunkPath);
            }
            writeStream.end();

            writeStream.on('finish', () => {
                //upload to cloud
                uploadVideoToCloud(finalPath).then(([err, video]) => {
                    if (err) {
                        next(new ApiError(err.http_code, err.message));
                        return;
                    } else {
                        res.status(StatusCodes.CREATED).json({
                            message: 'upload video to cloudinary successfull!',
                            uploadId,
                            chunk,
                            phase: 'finished',
                            data: video,
                        });
                    }
                    fs.unlinkSync(finalPath);
                });

                // setTimeout(() => {
                //     res.json({ msg: 'finished' });
                // }, 3000);
            });

            // Event listener for any errors during the write operation
            writeStream.on('error', (err) => {
                next(
                    new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, err.message)
                );
            });
            return;
        }
        res.status(StatusCodes.OK).json({
            message: 'sucesss',
            data: {
                uploadId,
                chunk,
            },
        });
    });
};

const createNew = async (req, res, next) => {
    try {
        const {
            allows,
            description,
            music,
            timePostVideo,
            videoData,
            viewable,
        } = req.body;

        const currentUserId = req.currentUser?.sub;
        const data = {
            uuid: uuidv4(),
            user_id: currentUserId,
            file_url: videoData.url,
            description,
            music,
            viewable,
            allows,
            published_at:
                timePostVideo === 'Now' ? new Date() : new Date(timePostVideo),
        };
        delete videoData.url;
        data.meta = videoData;
        const cover = req.filePath;

        if (cover) {
            const [error, image] = await uploadCoverToCloud(cover);
            fs.unlinkSync(cover);
            if (error) {
                throw new ApiError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    error.message
                );
            } else {
                data.thumb = {
                    public_id: image.public_id,
                    url: image.secure_url,
                };
            }
        }

        const responseData = await videoServices.createVideo(data);
        res.status(StatusCodes.CREATED).json({
            message: 'success',
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

const getListVideos = async (req, res, next) => {
    try {
        const perPage = 15;
        const { type, page } = req.query;
        const [listVideos, videoCount] = await videoServices.getListVideos({
            type,
            page,
            perPage,
        });

        const data = listVideos.map((video) => {
            const { size, width, height, duration, format } = video.meta;
            return {
                ...video.toJSON(),
                meta: {
                    format,
                    size: Number(size),
                    width: Number(width),
                    height: Number(height),
                    duration: Number(duration),
                },
            };
        });
        res.status(StatusCodes.OK).json({
            data,
            meta: {
                pagination: {
                    total: videoCount,
                    per_page: perPage,
                    total_pages: Math.ceil(videoCount / perPage),
                    current_page: Number(page),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

const getVideo = async (req, res, next) => {
    const { uuid } = req.params;
    try {
        const video = await videoServices.getVideo(uuid);
        const { size, width, height, duration, format } = video.meta;
        const data = {
            ...video.toJSON(),
            meta: {
                format,
                size: Number(size),
                width: Number(width),
                height: Number(height),
                duration: Number(duration),
            },
        };

        res.status(StatusCodes.OK).json({
            data,
        });
    } catch (error) {
        next(error);
    }
};

const removeExistFile = (req, res, next) => {
    const { chunk, uploadId } = req.body;
    const filePath = path.join(
        'src/public/videos',
        `${uploadId}.part${chunk}.mp4`
    );
    try {
        if (fs.existsSync(filePath)) {
            console.log('Tệp đã tồn tại (đồng bộ).', filePath);
            fs.unlinkSync(filePath);
            res.json({ msg: 'success' });
        } else {
            console.log('Tệp không tồn tại (đồng bộ).');
            res.json({ msg: 0 });
        }
    } catch (error) {
        next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
};

const uploadVideoCover = (req, res, next) => {
    imageMulterUpload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            next(new ApiError(422, err.message));
            return;
        } else if (err) {
            next(new ApiError(422, err.message));
            return;
        }

        const { path } = req.file;

        // //upload to cloud
        uploadImageToCloud(path).then(([err, image]) => {
            if (err) {
                next(new ApiError(err.http_code, err.message));
            } else {
                res.json({
                    message: 'upload image to cloudinary successfull!',
                    data: image,
                });
            }
            fs.unlinkSync(path);
        });
    });
};

export {
    createNew,
    uploadVideo,
    uploadVideoCover,
    removeExistFile,
    getListVideos,
    getVideo,
};
