import bcrypt from 'bcryptjs'

export const hash = ({plainText , salt = process.env.SALT_ROUND} = {})=>{
    const hashedValue = bcrypt.hashSync(plainText , parseInt(salt))
    return hashedValue
}

export const compare = ({plainText , cypherText} = {})=>{
    const match = bcrypt.compareSync(plainText , cypherText)
    return match
}