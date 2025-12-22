This prompt applies to files with the extension ".cs" (csharp-files)
Also, only classes and structs are affected.

## File structure
- Apply these rules to the file structure ONLY when asked to organize the files. Always ask for approval before proceeding to organize, to avoid human mistakes:
	- Order the members of classes and structs in the following order: constants -> fields -> properties -> methods -> constructors
	- Order the different members according to their modifiers:
		- fields should always be private, so no specific ordering here
		- for constants: public -> private
		- for properties: public -> protected -> internal protected -> internal
		- for methods: private -> internal -> protected -> internal protected -> public
		- Constructors must always be the last part of the Type (after all methods)
	- put a region with the name "Fields" around the fields
	- put a region with the name "Properties" around the properties
	- put a region with the name "Private Methods" around the private methods
	- put a region with the name "Internal Methods" around the internal methods
	- put a region with the name "Protected Methods" around the protected methods
	- put a region with the name "Internal Protected Methods" around the internal protected methods
	- put a region with the name "Public Methods" around the public methods
	- put a region with the name "Constructors" around the constructors
	- do not repeat the region name when adding the endregion-tag
