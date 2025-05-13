import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import ApiError from '~/utils/ApiError';
import {
    imageMulterUpload,
    videoMulterUpload,
    singleAttachmentMulterUpload,
} from '~/utils/uploadFile';
import fs from 'fs';

const uploadSingleFile = {
    onlyImage(req, res, next) {
        imageMulterUpload(req, res, (err) => {
            //parser form-data
            if (err instanceof multer.MulterError) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            } else if (err) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            }

            const { path } = req.file || {};
            req.filePath = path;
            next();
        });
    },
    onlyVideo(req, res, next) {
        videoMulterUpload(req, res, (err) => {
            //parser form-data
            if (err instanceof multer.MulterError) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            } else if (err) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            }

            const { path } = req.file || {};
            req.filePath = path;
            next();
        });
    },

    bothImageAndVideo(req, res, next) {
        singleAttachmentMulterUpload(req, res, (err) => {
            //parser form-data
            if (err instanceof multer.MulterError) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            } else if (err) {
                next(
                    new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message)
                );
                return;
            }
            const file = req.file;
            if (
                file &&
                file.mimetype.split('/')[0] === 'image' &&
                file.size > 5 * 1024 * 1024
            ) {
                next(
                    new ApiError(
                        StatusCodes.UNPROCESSABLE_ENTITY,
                        'The image must not exceed 5 MB'
                    )
                );
                fs.unlinkSync(file.path);
                return;
            }
            req.attachment = file
                ? {
                      path: file.path,
                      type: file.mimetype.split('/')[0],
                  }
                : null;
            next();
        });
    },
};

export default uploadSingleFile;
