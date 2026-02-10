const { tool } = require('ai');
const { z } = require('zod');

const getFaqs = () => {
    return `
Q1. What is a Credit Score?
A1. A credit score is a 3-digit number that rates your creditworthiness. This rating varies from 300 to 900. You can maintain a high credit score by honouring your EMI on time.

Q2. Who issues the Credit Score?
A2. The credit score and credit report are calculated and provided by four credit bureaus in India, namely Equifax, CIBIL, CRIF, and Experian.

Q3. How is the credit score calculated?
A3. Payment history – On-time and consistent repayment provides a positive score.

Q4. What is considered a good credit score?
A4. Having a credit score of 700+ is considered the best.

Q5. Why should I maintain a good credit score?
A5. A good credit score is essential for securing a loan at the best rates and a higher credit card limit.

Q6. What causes a poor or bad credit score?
A6. Not paying EMI on time and credit card dues every month will cause bad credit score.

Q7. How often can I check my credit score?
A7. You can check your credit score as many times as you want, and it will not affect your score.

Q8. Which is the most accurate credit report?
A8. Credit scores from all four credit bureaus are accurate. While there may be slight variations in the score due to different algorithms, all four scores are equally valid and accepted by lenders.

Q9. Are credit scores from all the bureaus the same?
A9. No. Your credit score is likely to vary depending on the bureau. The credit scores generated are not the same, as each bureau has its scoring method.

Q10. Where can I check my credit score?
A10. There are 4 different credit bureaus in India that record your credit score. According to RBI regulations, you are entitled to one free credit report per year from any of the credit bureaus.

Q11. How can I get my free credit report?
A11. You can also pay the fee to receive detailed and accurate credit reports delivered directly to your inbox, 12 times a year by all the 4 credit bureaus.

Q12. How can I check my CIBIL score online?
A12. One can check their credit score from any of the credit bureaus' websites. The CIBIL score is easily accessible on the CIBIL website.

Q13. Can I improve a poor credit score?
A13. The good news is that a poor credit score is not permanent; you can always improve it by taking appropriate steps. Although it may take some time, it is worth improving your score before applying for a new loan.

Q14. Can I get a loan or credit card with a poor credit score?
A14. Getting a loan with a poor credit score is difficult. So, it's always a good idea to improve your credit score before applying for a new loan or credit card.

Q15. How long does it take to improve my credit score?
A15. It takes 6 to 12 months to improve your credit score based on the timely repayment of the new loan that you avail.

Q16. I have already settled my personal loan and credit card. Why is my CIBIL score still low?
A16. Even if you have settled your loan or credit card, any unpaid or unsettled portion may still be reflected in your CIBIL report as an overdue amount.

Q17. What is Rag?
A17. Rag is a credit counselling services company registered in Chennai. We specialize in helping individuals improve their CIBIL scores by providing solutions to resolve the unsettled amounts reflected in their credit reports.

Q18. How does Rag help improve my CIBIL score?
A18. Rag provides solutions to clear unsettled amounts on personal loans and credit cards that appear in your CIBIL report. By securing a loan from an RBI-registered financial Institution to pay the unsettled amount on the existing loan.

Q19. Will Rag help me if my CIBIL score is below 700?
A19. Yes, Rag will help, provided you have no more than two settled accounts.

Q20. What is the maximum amount of financial support available to improve a credit score?
A20. Rag will help by facilitating through an RBI registered financial institution. The amount provided by them is up to 2 Lakhs maximum, we will connect them with you.

Q21. What is the Rate of Interest for the loan provided?
A21. The Loan is provided by an RBI-registered financial institution; we will connect them with you.

Q22. What is the tenure of the loan that I will get?
A22. The Loan is provided by an RBI-registered financial institution. The tenure provided by them is minimum 6 months and a maximum of 24 months. We will connect them with you.

Q23. Can Rag help me secure funding to clear my settled overdue accounts?
A23. Yes, Rag assists customers in securing funding from an RBI-registered financial institution to clear overdue amounts on settled accounts only, thus improving their credit profile.

Q24. Will I get a loan to pay the outstanding unsettled amount?
A24. It is for salaried customers who are currently employed.

Q25. I am self-employed, will I get a loan to pay the outstanding unsettled amount?
A25. It is only for salaried customers currently employed.

Q26. Does Rag charge any fees for its services?
A26. Rag does not charge any fees from customers for its credit counselling service, unlike other counselling companies.

Q27. Who can benefit from Rag's services?
A27. Any salaried customer currently employed who has settled personal loan or credit cards with not more than two accounts, but still has outstanding dues can benefit from our services.

Q28. How can I get started with Rag's services?
A28. Once you give your consent to proceed, our experts will assess your CIBIL report and offer the best solutions to clear the unsettled amounts.

Q29. Where is Rag located?
A29. Rag's registered office is in Chennai.

Q30. Why should I share my CIBIL Details?
A30. A credit report is essential to understand your outstanding amount with financial institutions.

Q31. How did you get my number?
A31. This call is on a random basis.

Q32. Are you calling from the bank?
A32. We are a credit counselling company and not a bank, we help customers by hand holding to come out of credit score issues.

Q33. Why should I give my consent to pull my CIBIL Report?
A33. Credit reports are secured, hence we require your consent to understand your current creditworthiness.

Q34. Who is the Promoter?
A34. Two Ex-Bankers with more than 25 years of experience each have started this new concept in India.

Q35. Why should I trust Rag?
A35. Thallam and Venkat, Ex-Bankers, have started this concept in India to help delinquent (settled) customers come out of their credit score issues.
`;
};

const faqTool = tool({
    description: "Get answers to frequently asked questions about Rag credit counselling services",
    parameters: z.object({
        retrieve: z.literal('all').default('all').describe("Retrieve all FAQs"),
    }),
    execute: async ({ retrieve }) => {
        console.log(`FAQ tool called to retrieve: ${retrieve}`);
        const faqs = getFaqs();
        return faqs;
    },
});

module.exports = {
    faqTool,
};
