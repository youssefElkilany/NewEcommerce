

 class ApiFeatures {
    constructor(queryData , mongooseQuery) {
        this.mongooseQuery = mongooseQuery
        this.queryData =  queryData
    }

    paginate()
    {
        let {page , size} = this.queryData
        if(!page || page <=0)
        {
            page = 1
        }
        if(!size || size <=0)
        {
            size = 3
        }

        const skip = (page-1)*size
        this.mongooseQuery.skip(parseInt(skip)).limit(parseInt(size))
        return this
    }

    filter()
    { // ana mmkn a7ot 7aget filter gowaha b3deha a5ot filter bas mn 8eer delete ba2y el7aga
        const excludedQuery = ['sort' , 'search' , 'select' , 'field']
        const filtedQuery = {...this.queryData}
        excludedQuery.forEach(query=>{
            delete filtedQuery(query)
        })

        this.mongooseQuery.find(JSON.parse(JSON.stringify(filtedQuery).replace(/(gt|gte|lt|lte|eq|neq|in|nin)/g,match =>`$${match}`)))

        return this
    }
    
    sort()
    {
        this.mongooseQuery.sort(this.queryData?.sort?.replaceAll(',',' '))
        return this
    }

    search(){
        this.mongooseQuery.find({
            $or:[
                {name:{$regex:this.queryData.search,$options:'i'}},
                {description:{$regex:this.queryData.search,$options:'i'}}
            ]}
        )
        return this
    }

    select(){

        this.mongooseQuery.select(this.mongooseQuery?.fields?.replaceAll(',',' '))
        return this
    }
}