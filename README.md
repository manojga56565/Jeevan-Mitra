# Jeevan Mitra

**A coordination layer connecting hospitals, blood banks, and eligible blood donors.**

Jeevan Mitra is a project concept focused on improving coordination during blood requirements. Instead of replacing blood banks, the proposed platform aims to help connect a request with potentially eligible donors using relevant matching information.

## The problem

During an urgent blood requirement, families may have to contact people individually or share requests across multiple groups. Donor information and hospital-side coordination can be fragmented, making it harder to identify suitable donors quickly.

## Proposed approach

Jeevan Mitra is designed around a coordinated flow:

1. A hospital-side blood requirement is raised.
2. The request is matched against donor information.
3. Potentially suitable donors are identified using blood-group compatibility, eligibility, donation cooldown, and location.
4. Relevant donors can be notified.
5. Donation and fulfilment status can be coordinated and verified by the appropriate participating organizations.

## Project positioning

Jeevan Mitra is intended to support coordination between hospitals, blood banks, and donors. It does **not** replace blood banks, medical screening, compatibility testing, or clinical decision-making.

## Important safety note

A platform match is only an initial coordination aid. Donor eligibility, blood grouping, cross-matching, collection, storage, and transfusion must remain under the responsibility of qualified healthcare professionals and authorized blood banks. The project must not promise that a donor is medically eligible or that a requested unit is available.

## Repository structure

The repository contains separate `frontend/` and `backend/` areas. Refer to the code and configuration in those folders for the current implementation details.

## Project status

This repository represents a developing project. Features and workflows should be treated as implemented only when they are present and tested in the codebase.

## Responsible development

Handle donor and patient information carefully. Any real-world deployment would require appropriate consent, access controls, data protection, security review, and coordination with authorized healthcare institutions.
