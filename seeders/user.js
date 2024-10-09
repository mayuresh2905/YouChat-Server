import { User } from "../models/user.js";
import { faker } from "@faker-js/faker"; 


export const createUser = async (numUser) => {
    try {
        const usersPromise  = []; 
        
        for (let index = 0; index < numUser; index++) {
            const tempUser = User.create({
              name: faker.person.fullName(),
              username: faker.internet.userName(),
              bio: faker.lorem.sentence(10),
              password: "password",
              avatar: {
                url: faker.image.avatar(),
                public_id: faker.system.fileName(),
              }
            });
            usersPromise.push(tempUser);        
        }

        await Promise.all(usersPromise);

        console.log(`${numUser} users created`);
        process.exit(1);
        

  } catch (error) {
        console.log(error);
        process.exit(1); 
    }
}