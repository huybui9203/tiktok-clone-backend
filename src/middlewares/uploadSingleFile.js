import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import ApiError from '~/utils/ApiError';
import { imageMulterUpload } from '~/utils/uploadFile';
import fs from 'fs'

const uploadSingleFile = (req, res, next) => {
    imageMulterUpload(req, res, (err) => {
        //parser form-data
        if (!req.file) {
            next();
            return;
        }
        if (err instanceof multer.MulterError) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        } else if (err) {
            next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, err.message));
            return;
        }

        const { path } = req.file;
        req.filePath = path;
        next();
    });
};

export default uploadSingleFile;
