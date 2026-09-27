import multer from "multer"


function fileUpload(){


    const storage = multer.diskStorage({})
    // we will make only validation
    const upload = multer({storage})
    return upload
}


export default fileUpload