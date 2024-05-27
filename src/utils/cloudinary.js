import {v2 as cloudinary} from 'cloudinary';
import exp from 'constants';
//file Handling
import fs from 'fs'

//configure SDK    
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.COUDINARY_API_KEY,
  api_secret: process.envCOUDINARY_API_SECRET
});


//Upload  Asset
const uploadOnCloudinary = async(localFilePath)=>{
    try{
        if(!localFilePath) return null

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully 
        console.log("File is uploaded on cloudnary", response.url);
        return response;
    }
    catch(error){
        fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed
        return null
    }
}


export {uploadOnCloudinary}




// from cloudinary website