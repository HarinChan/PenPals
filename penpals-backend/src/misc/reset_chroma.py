import chromadb
from chromadb.config import Settings # You need this import!

if __name__ == '__main__':
    # Correct way for PersistentClient
    client = chromadb.PersistentClient(
        path="./chroma_db", 
        settings=Settings(allow_reset=True) # <- Pass it inside the Settings object
    )

    # You can now call the reset method
    client.reset()