

 class ApiFeatures {
    constructor(queryData , mongooseQuery) {
        this.mongooseQuery = mongooseQuery
        this.queryData =  queryData
    }

    paginate()
    {
         const requestedPage = Number(this.queryData?.page);
         const requestedSize = Number(this.queryData?.size);

         // validate that it must be integer and positive number else default
    const page =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1

    const size =
        Number.isSafeInteger(requestedSize) && requestedSize > 0
            ? Math.min(requestedSize, 100)
            : 3

        const skip = (page-1)*size
        this.mongooseQuery.skip(parseInt(skip)).limit(parseInt(size))
        return this
    }

    filter()
    { // ana mmkn a7ot 7aget filter gowaha b3deha a5ot filter bas mn 8eer delete ba2y el7aga
        const excludedQuery = ['sort' , 'search' , 'select' , 'field' , "page" , "size"]
        const filteredQuery = {...this.queryData}
        excludedQuery.forEach(query=>{
            delete filteredQuery[query]
        })

        this.mongooseQuery?.find(JSON.parse(JSON.stringify(filteredQuery).replace(/(gt|gte|lt|lte|eq|neq|in|nin)/g,match =>`$${match}`)))

        return this
    }
    
    sort()
    {
       const sort = this.queryData?.sort;

    this.mongooseQuery.sort(
        typeof sort === 'string' && sort.trim()
            ? sort.replaceAll(',', ' ')
            : { createdAt: -1, _id: -1 }
    );
        return this
    }

    search(){ 

         const search = this.queryData?.search;

    if (typeof search !== 'string' || !search.trim()) {
        return this;
    }
        this.mongooseQuery?.find({
            $or:[
                {name:{$regex:search.trim(),$options:'i'}},
                {description:{$regex:search.trim(),$options:'i'}}
            ]}
        )
        return this
    }

    select(){

        this.mongooseQuery.select(this.queryData?.fields?.replaceAll(',',' '))
        return this
    }
}

export default ApiFeatures