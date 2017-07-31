const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList
} = require('graphql')

const ql = require('./index')

const TopicType = new GraphQLObjectType({
  name: 'Topic',
  description: 'topic description',
  fields: () => ({
    type: {
      type: GraphQLString,
    },
    fileName: {
      type: GraphQLString
    },
    title: {
      type: GraphQLString
    }
  })
})

const QueryType = new GraphQLObjectType({
  name: 'Query',
  description: '...',
  fields: () => ({
    topics: {
      type: new GraphQLList(TopicType),
      args: {
        id: { type: GraphQLString }
      },
      resolve: () => ql.getTopicList()
      .then(topics => {
        console.log(topics)
        return topics
      })
    }
  })
})

module.exports = new GraphQLSchema({
  query: QueryType
})
