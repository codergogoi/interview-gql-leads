const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// GraphQL Schema
const typeDefs = gql`
  type Lead {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
    status: LeadStatus!
    createdAt: String!
    updatedAt: String!
  }

  enum LeadStatus {
    New
    Contact
    UploadScope
    Estimate
    SignContract
    Payment
    Installation
    Completed
    Feedback
  }

  type Query {
    leads: [Lead]
    leadByName(name: String!): [Lead]
  }

  type Mutation {
    createLead(
      name: String!
      email: String!
      phone: String!
      address: String!
      status: LeadStatus
    ): Lead
    updateLeadStatus(id: ID!, status: LeadStatus!): Lead
    deleteLead(id: ID!): Boolean
  }
`;

// MongoDB Model
const Lead = mongoose.model("Lead", {
  name: String,
  email: String,
  phone: String,
  address: String,
  status: {
    type: String,
    enum: [
      "New",
      "Contact",
      "UploadScope",
      "Estimate",
      "SignContract",
      "Payment",
      "Installation",
      "Completed",
      "Feedback",
    ],
    default: "New", // Set a default value if needed
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// GraphQL Resolvers
const resolvers = {
  Query: {
    leads: async () => await Lead.find(),
    leadByName: async (_, { name }) => {
      try {
        // Use regex for case-insensitive search
        const leads = await Lead.find({
          name: { $regex: name, $options: "i" },
        });
        if (!leads) return [];
        return leads;
      } catch (error) {
        console.error("Error fetching leads by name:", error);
        return [];
      }
    },
  },
  Mutation: {
    createLead: async (_, { name, email, phone, address, status }) => {
      const newLead = new Lead({ name, email, phone, address, status });
      await newLead.save();
      return newLead;
    },
    updateLeadStatus: async (_, { id, status }) => {
      // Find the lead by ID and update the status
      const updatedLead = await Lead.findByIdAndUpdate(
        id,
        { status, updatedAt: Date.now() },
        { new: true } // Return the updated document
      );
      return updatedLead;
    },
    deleteLead: async (_, { id }) => {
      try {
        const deletedLead = await Lead.findByIdAndDelete(id);
        return !!deletedLead; // Returns true if lead was deleted, false if it wasn't found
      } catch (error) {
        console.error("Error deleting lead:", error);
        return false;
      }
    },
  },
};

// Apollo Server setup
const server = new ApolloServer({ typeDefs, resolvers });

server.start().then(() => {
  server.applyMiddleware({ app });

  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
});
